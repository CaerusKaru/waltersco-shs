import {Monitor, MonitorWithStatus} from './item';

import AWS = require('aws-sdk');
import { httpResponse, httpServerError } from './http-response';
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (): Promise<any> => {

  const params = {
    TableName: TABLE_NAME
  };

  const getAlarms = async (items: Monitor[]): Promise<MonitorWithStatus[]> => {
    try {
      const monitorById: { [id: string]: Monitor } = { };

      for (const item of items) {
        monitorById[item.monitorId] = item;
      }

      const alarmsResult = await cw.describeAlarms({
        AlarmNames: Object.keys(monitorById),
      }).promise();

      const alarms = alarmsResult.MetricAlarms;
      if (!alarms) {
        throw new Error(`No alarms`);
      }

      const result = new Array<MonitorWithStatus>();
      for (const alarm of alarms) {
        if (!alarm.AlarmName) { continue; } // unlikely
        const monitor = monitorById[alarm.AlarmName];
        if (!monitor) { continue; } // unlikely
        const status = alarm.StateValue === 'OK' ? 'green' : 'red';

        result.push({
          ...monitor,
          status
        });
      }

      return result;
    } catch (cwError) {
      return items.map(item => ({
        ...item,
        status: 'red',
      }));
    }
  };

  try {
    const response = await db.scan(params).promise();
    const items = response.Items as Monitor[];
    const statusItems: MonitorWithStatus[] = await getAlarms(items);
    return httpResponse(statusItems);
  } catch (error) {
    return httpServerError(error);
  }
};
