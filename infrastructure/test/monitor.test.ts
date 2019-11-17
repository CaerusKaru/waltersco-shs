import {expect as expectCDK, haveResource} from '@aws-cdk/assert';
import {App, Stack} from '@aws-cdk/core';

import {AttributeType, Table} from '@aws-cdk/aws-dynamodb';
import {MonitorCheck} from '../lib/monitor';

test('MonitorCheck', () => {
  // WHEN
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      region: 'us-east-1'
    },
  });
  const table = new Table(stack, 'Table', {
    tableName: 'test_table',
    partitionKey: {
      name: 'test_key',
      type: AttributeType.STRING
    },
  });
  new MonitorCheck(stack, 'MonitorCheck', {
    table,
  });
  // THEN
  expectCDK(stack).to(haveResource('AWS::Events::Rule', {
    ScheduleExpression: "rate(1 minute)",
    State: "ENABLED",
    Targets: [
      {
        Arn: {
          "Fn::GetAtt": [
            "MonitorCheckUpdateFunction65B0A250",
            "Arn"
          ]
        },
        Id: "Target0"
      }
    ]
  }));
  expectCDK(stack).to(haveResource('AWS::Lambda::Function', {
    Handler: "monitor-check.handler",
    Role: {
      "Fn::GetAtt": [
        "MonitorCheckUpdateFunctionServiceRole21B28516",
        "Arn"
      ]
    },
    Runtime: "nodejs10.x",
    Environment: {
      Variables: {
        TABLE_NAME: {
          Ref: "TableCD117FA1"
        }
      }
    }
  }));
  expectCDK(stack).to(haveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: "cloudwatch:SetAlarmState",
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:Query",
            "dynamodb:GetItem",
            "dynamodb:Scan"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "TableCD117FA1",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ],
      Version: "2012-10-17"
    },
  }));
});
