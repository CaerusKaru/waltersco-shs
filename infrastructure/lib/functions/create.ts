import AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
import crypto = require("crypto");
import { httpResponse, httpServerError } from './http-response';
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

export const handler = async (event: any = {}): Promise <any> => {
  if (!event.body) {
    return httpResponse({ error: 'invalid request, you are missing the parameter body' }, 400);
  }

  const item = typeof event.body === 'object' ? event.body : JSON.parse(event.body);
  const itemId = generateId();
  const fullItem = {
    [PRIMARY_KEY]: itemId,
    ...item
  };

  const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
    TableName: TABLE_NAME,
    Item: fullItem
  };

  try {
    await db.put(params).promise();

    await cw.putMetricAlarm({
      MetricName: 'Pings',
      Statistic: 'Sum',
      Namespace: 'ServiceHealthSystem',
      Period: 60,
      AlarmName: itemId,
      TreatMissingData: 'ignore',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 1,
      Threshold: 1
    }).promise();

    return httpResponse(fullItem, 201);
  } catch (error) {
    return httpServerError(error);
  }
};

function generateId() {
  return crypto.randomBytes(16).toString("hex");
}