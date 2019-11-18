import * as AWS from 'aws-sdk';
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
import * as crypto from "crypto";
import { httpBadRequestError, httpResponse, httpServerError } from './http-response';
import { Monitor, MonitorConfiguration } from './item';
import { pingMonitor } from './monitor-check';
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (event: any = {}): Promise <any> => {
  if (!event.body) {
    return httpResponse({ error: 'invalid request, you are missing the parameter body' }, 400);
  }

  const item: MonitorConfiguration = typeof event.body === 'object' ? event.body : JSON.parse(event.body);

  // validate all required fields are here
  if (!item.app) { return httpBadRequestError('"app" is required'); }
  if (!item.endpoint) { return httpBadRequestError('"endpoint" is required'); }
  if (!item.region) { return httpBadRequestError('"region" is required'); }

  const monitorId = generateId();
  const monitor: Monitor = {
    monitorId,
    app: item.app,
    endpoint: item.endpoint,
    region: item.region
  };

  const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
    TableName: TABLE_NAME,
    Item: monitor
  };

  try {
    await db.put(params).promise();

    await cw.putMetricAlarm({
      MetricName: 'Pings',
      Statistic: 'Sum',
      Namespace: 'ServiceHealthSystem',
      Period: 60,
      AlarmName: monitorId,
      TreatMissingData: 'ignore',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 1,
      Threshold: 1
    }).promise();

    // ping & update monitor
    await pingMonitor(monitor);

    return httpResponse(monitor, 201);
  } catch (error) {
    return httpServerError(error);
  }
};

function generateId() {
  return crypto.randomBytes(16).toString("hex");
}