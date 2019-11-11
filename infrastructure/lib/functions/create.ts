import {ComparisonOperator} from '@aws-cdk/aws-cloudwatch';

const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
const uuidv4 = require('uuid/v4');
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`;
const EXECUTION_ERROR = `Error: Execution update, caused an error, please take a look at your CloudWatch Logs.`;

export const handler = async (event: any = {}) : Promise <any> => {

  if (!event.body) {
    return {
      statusCode: 400,
      body: 'invalid request, you are missing the parameter body',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
  const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
  const itemId = uuidv4();
  item[PRIMARY_KEY] = itemId;
  const params = {
    TableName: TABLE_NAME,
    Item: item
  };

  try {
    await db.put(params).promise();
    await cw.putMetricAlarm({
      AlarmName: itemId,
      ComparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      EvaluationPeriods: 1,
    });
    return {
      statusCode: 201,
      body: '',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  } catch (dbError) {
    const errorResponse = dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword') ?
      RESERVED_RESPONSE : EXECUTION_ERROR;
    return {
      statusCode: 400,
      body: errorResponse,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};
