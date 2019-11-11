import {Construct, Duration} from '@aws-cdk/core';
import {Rule, Schedule} from '@aws-cdk/aws-events';
import {AssetCode, Function, Runtime} from '@aws-cdk/aws-lambda';
import {join} from 'path';
import {LambdaFunction} from '@aws-cdk/aws-events-targets';
import {Table} from '@aws-cdk/aws-dynamodb';
import { PolicyStatement } from '@aws-cdk/aws-iam';

/**
 * The required properties for periodically updating a set of monitors
 * every minute.
 */
export interface MonitorCheckProps {
  /**
   * The name of the table hosting the monitors to check
   */
  table: Table;
}

/**
 * A construct to update the status of the monitors. These are captured
 * in CloudWatch Alarms for easy storage, retrieval, and visualization.
 */
export class MonitorCheck extends Construct {
  readonly rule: Rule;

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
      schedule: Schedule.rate(Duration.minutes(1)),
      targets: [new LambdaFunction(monitorCheck)],
    });
  }
}
