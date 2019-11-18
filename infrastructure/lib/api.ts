import {
  Cors,
  DomainNameOptions,
  EndpointType,
  LambdaIntegration,
  RestApi
} from '@aws-cdk/aws-apigateway';
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import {AttributeType, Table} from '@aws-cdk/aws-dynamodb';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import {AssetCode, Function, Runtime} from '@aws-cdk/aws-lambda';
import {ARecord, IHostedZone, RecordTarget} from '@aws-cdk/aws-route53';
import { ApiGateway } from '@aws-cdk/aws-route53-targets';
import {CfnOutput, Construct, RemovalPolicy} from '@aws-cdk/core';
import {join} from 'path';

const PARTITION_KEY_NAME = 'monitorId';

export interface ApiProps {
  readonly domainName?: string;
  readonly hostedZone?: IHostedZone;
}

/**
 * The WaltersCo Service Health System (SHS) is a centralized internal service which continuously monitors all our
 * service endpoints. It has the following API interface:
 *
 * GET /status - get the status of all registered monitors
 * POST /monitors - create a new monitor
 * PUT /monitors/{id} - update an existing monitor
 * DELETE /monitors/{id} - delete an existing monitor
 *
 * The API fronts a DynamoDB table that stores all of the monitors for access later.
 */
export class Api extends Construct {
  public readonly api: RestApi;
  public readonly table: Table;

  constructor(parent: Construct, name: string, props: ApiProps = { }) {
    super(parent, name);

    // Create the table to store the monitor configurations

    this.table = new Table(this, 'Monitors', {
      partitionKey: {
        name: PARTITION_KEY_NAME,
        type: AttributeType.STRING
      },
      tableName: 'monitors',

      // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
      // the new table, and it will remain in your account until manually deleted. By setting the policy to
      // DESTROY, cdk destroy will delete the table (even if it has data in it)
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    // Define the Lambdas to access the DynamoDB table

    const getAll = new Function(this, 'getAllMonitorsFunction', {
      code: new AssetCode(join(__dirname, 'functions')),
      handler: 'get-all.handler',
      runtime: Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: this.table.tableName,
        PRIMARY_KEY: PARTITION_KEY_NAME
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ['cloudwatch:DescribeAlarms'],
          resources: ['*'],
        })
      ]
    });

    const createOne = new Function(this, 'createMonitorFunction', {
      code: new AssetCode(join(__dirname, 'functions')),
      handler: 'create.handler',
      runtime: Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: this.table.tableName,
        PRIMARY_KEY: PARTITION_KEY_NAME
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ['cloudwatch:PutMetricAlarm', 'cloudwatch:SetAlarmState'],
          resources: ['*'],
        })
      ]
    });

    const updateOne = new Function(this, 'updateMonitorFunction', {
      code: new AssetCode(join(__dirname, 'functions')),
      handler: 'update.handler',
      runtime: Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: this.table.tableName,
        PRIMARY_KEY: PARTITION_KEY_NAME
      }
    });

    const deleteOne = new Function(this, 'deleteMonitorFunction', {
      code: new AssetCode(join(__dirname, 'functions')),
      handler: 'delete.handler',
      runtime: Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: this.table.tableName,
        PRIMARY_KEY: PARTITION_KEY_NAME
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ['cloudwatch:DeleteAlarms'],
          resources: ['*']
        })
      ]
    });

    this.table.grantReadData(getAll);
    this.table.grantReadWriteData(createOne);
    this.table.grantReadWriteData(updateOne);
    this.table.grantReadWriteData(deleteOne);

    // Create the API to access the monitors

    let domainNameOptions: DomainNameOptions | undefined;
    if (props.domainName && props.hostedZone) {
      domainNameOptions = {
        certificate: new DnsValidatedCertificate(this, 'Certificate', {
          domainName: props.domainName,
          hostedZone: props.hostedZone,
          region: 'us-east-1',
        }),
        endpointType: EndpointType.EDGE,
        domainName: props.domainName
      };

      new CfnOutput(this, 'DomainEndpoint', { value: `https://${props.domainName}` });
    }

    this.api = new RestApi(this, 'SHS API', {
      restApiName: 'Service Health System',
      description: 'This service registers and fetches monitors and their statuses.',
      domainName: domainNameOptions
    });

    if (props.hostedZone && props.domainName) {
      const parts = props.domainName.split('.');
      const recordName = parts.slice(0, parts.length - 2).join('.');
      new ARecord(this, 'CustomDomainAliasRecord', {
        zone: props.hostedZone,
        recordName,
        target: RecordTarget.fromAlias(new ApiGateway(this.api))
      });
    }

    const status = this.api.root.addResource('status');
    const getStatusIntegration = new LambdaIntegration(getAll);
    status.addMethod('GET', getStatusIntegration);

    const monitors = this.api.root.addResource('monitors');
    const createMonitorIntegration = new LambdaIntegration(createOne);
    monitors.addMethod('GET', getStatusIntegration);
    monitors.addMethod('POST', createMonitorIntegration);

    const singleMonitor = monitors.addResource('{id}');

    const updateMonitorIntegration = new LambdaIntegration(updateOne);
    singleMonitor.addMethod('PUT', updateMonitorIntegration);

    const deleteMonitorIntegration = new LambdaIntegration(deleteOne);
    singleMonitor.addMethod('DELETE', deleteMonitorIntegration);

    this.api.root.addCorsPreflight({allowOrigins: Cors.ALL_ORIGINS, allowMethods: Cors.ALL_METHODS});
  }
}
