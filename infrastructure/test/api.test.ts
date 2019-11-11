import {App, Stack} from '@aws-cdk/core';
import {expect as expectCDK, haveResource} from '@aws-cdk/assert';

import {Api} from '../lib/api';


test('Api', () => {
  // WHEN
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      region: 'us-east-1'
    },
  });
  new Api(stack, 'Api');
  // THEN
  expectCDK(stack).to(haveResource('AWS::DynamoDB::Table', {
      "KeySchema": [
        {
          "AttributeName": "monitorId",
          "KeyType": "HASH"
        }
      ],
      "AttributeDefinitions": [
        {
          "AttributeName": "monitorId",
          "AttributeType": "S"
        }
      ],
      "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
      },
      "TableName": "monitors"
  }));
  expectCDK(stack).to(haveResource('AWS::ApiGateway::RestApi'));
  expectCDK(stack).to(haveResource('AWS::Lambda::Function', {
    "Handler": "get-all.handler",
    "Role": {
      "Fn::GetAtt": [
        "ApigetAllMonitorsFunctionServiceRole7E122D9A",
        "Arn"
      ]
    },
    "Runtime": "nodejs10.x",
    "Environment": {
      "Variables": {
        "TABLE_NAME": {
          "Ref": "ApiMonitors790A3430"
        },
        "PRIMARY_KEY": "monitorId"
      }
    }
  }));
  expectCDK(stack).to(haveResource('AWS::Lambda::Function', {
    "Handler": "create.handler",
    "Role": {
      "Fn::GetAtt": [
        "ApicreateMonitorFunctionServiceRole39D5B2FB",
        "Arn"
      ]
    },
    "Runtime": "nodejs10.x",
    "Environment": {
      "Variables": {
        "TABLE_NAME": {
          "Ref": "ApiMonitors790A3430"
        },
        "PRIMARY_KEY": "monitorId"
      }
    }
  }));
  expectCDK(stack).to(haveResource('AWS::Lambda::Function', {
    "Handler": "update.handler",
    "Role": {
      "Fn::GetAtt": [
        "ApiupdateMonitorFunctionServiceRole90A7DC67",
        "Arn"
      ]
    },
    "Runtime": "nodejs10.x",
    "Environment": {
      "Variables": {
        "TABLE_NAME": {
          "Ref": "ApiMonitors790A3430"
        },
        "PRIMARY_KEY": "monitorId"
      }
    }
  }));
  expectCDK(stack).to(haveResource('AWS::Lambda::Function', {
    "Handler": "delete.handler",
    "Role": {
      "Fn::GetAtt": [
        "ApideleteMonitorFunctionServiceRole25973C72",
        "Arn"
      ]
    },
    "Runtime": "nodejs10.x",
    "Environment": {
      "Variables": {
        "TABLE_NAME": {
          "Ref": "ApiMonitors790A3430"
        },
        "PRIMARY_KEY": "monitorId"
      }
    }
  }));
});
