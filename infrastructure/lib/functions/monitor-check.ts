// tslint:disable: max-line-length
// tslint:disable: no-console
import {IncomingMessage} from 'http';
import {Monitor, MonitorConfiguration} from './item';

import AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (): Promise<any> => {
  const setAlarms = async (items: Monitor[]) => {

    for (const item of items) {
      await pingMonitor(item);
    }
  };

  try {
    const response = await db.scan({ TableName: TABLE_NAME }).promise();
    const items: Monitor[] = response.Items as Monitor[];
    await setAlarms(items);
    return true;
  } catch (dbError) {
    return false;
  }
};

export async function pingMonitor(monitor: Monitor) {
  const { endpoint } = monitor;
  if (!endpoint) {
    console.error('warning: no "endpoint" for item:', monitor);
    return;
  }

  console.log('pinging', endpoint);
  const status = await pingUrl(endpoint);

  const stateValue = status ? 'OK' : 'ALARM';
  const stateReason = `Last ping at ${new Date().toISOString()}`;
  console.log(`Updating cw alarm ${monitor.monitorId} to value ${stateValue} with reason ${stateReason} (app=${monitor.app}, region=${monitor.region})`);
  await cw.setAlarmState({
    AlarmName: monitor.monitorId,
    StateReason: stateReason,
    StateValue: stateValue,
  }).promise();
}

// Taken with modifications from https://www.tomas-dvorak.cz/posts/nodejs-request-without-dependencies/
const pingUrl = (url: string): Promise<boolean> => {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on requested url
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response: IncomingMessage) => {
      // handle http errors (redirects are ok)
      if (!response || !response.statusCode || response.statusCode < 200 || response.statusCode > 399) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    // handle connection errors of the request
    request.on('error', (_: any) => resolve(false));
  });
};
