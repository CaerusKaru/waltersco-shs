import {DbItem, StatusDbItem} from './item';

import AWS = require('aws-sdk');
import { httpResponse, httpServerError } from './http-response';
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (): Promise<any> => {

  const params = {
    TableName: TABLE_NAME
  };

  const getAlarms = async (items: DbItem[]): Promise<StatusDbItem[]> => {
    try {
      const alarmsResult = await cw.describeAlarms({
        AlarmNames: items.map(item => item.monitorId),
      }).promise();

      const alarms = alarmsResult.MetricAlarms;
      if (!alarms) {
        throw new Error(`No alarms`);
      }

      return items.map((item, i) => {
        const alarm = alarms[i];
        return {
          ...item,
          status: alarm.StateValue === 'OK' ? 'green' : 'red',
        };
      });
    } catch (cwError) {
      return items.map(item => ({
        ...item,
        status: 'red',
      }));
    }
  };

  try {
    const response = await db.scan(params).promise();
    const items = response.Items as DbItem[];
    const statusItems: StatusDbItem[] = await getAlarms(items);
    return httpResponse(statusItems);
  } catch (error) {
    return httpServerError(error);
  }
};
