import {Table} from '@aws-cdk/aws-dynamodb';
import {Rule, Schedule} from '@aws-cdk/aws-events';
import {LambdaFunction} from '@aws-cdk/aws-events-targets';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import {AssetCode, Function, Runtime} from '@aws-cdk/aws-lambda';
import {Construct, Duration} from '@aws-cdk/core';
import {join} from 'path';

/**
 * The required properties for periodically updating a set of monitors
 * every minute.
 */
export interface MonitorCheckProps {
  /**
   * The name of the table hosting the monitors to check
   */
  readonly table: Table;

  /**
   * How frequently to run the monitor check.
   * @default 1 minute
   */
  readonly schedule?: Duration;
}

/**
 * A construct to update the status of the monitors. These are captured
 * in CloudWatch Alarms for easy storage, retrieval, and visualization.
 */
export class MonitorCheck extends Construct {
  public readonly rule: Rule;

  constructor(scope: Construct, name: string, props: MonitorCheckProps) {
    super(scope, name);

    const monitorCheck = new Function(this, 'UpdateFunction', {
      code: new AssetCode(join(__dirname, 'functions')),
      handler: 'monitor-check.handler',
      runtime: Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: props.table.tableName,
      }
    });

    monitorCheck.addToRolePolicy(new PolicyStatement({
      actions: ['cloudwatch:SetAlarmState'],
      resources: ['*'],
    }));

    props.table.grantReadData(monitorCheck);

    this.rule = new Rule(this, 'MonitorUpdate', {
      description: 'Checks the status of all registered monitors for SHS.',
      schedule: Schedule.rate(props.schedule || Duration.minutes(1)),
      targets: [new LambdaFunction(monitorCheck)],
    });
  }
}
