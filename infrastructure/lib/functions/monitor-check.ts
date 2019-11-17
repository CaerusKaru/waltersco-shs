// tslint:disable: no-console
import {IncomingMessage} from 'http';
import {DbItem} from './item';

import AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (): Promise<any> => {
  const setAlarms = async (items: DbItem[]) => {

    for (const item of items) {
      const { endpoint } = item;
      if (!endpoint) {
        console.error('warning: no "endpoint" for item:', item);
        continue;
      }

      console.log('pinging', endpoint);
      const status = await pingUrl(endpoint);

      const stateValue = status ? 'OK' : 'ALARM';
      const stateReason = `Last ping at ${new Date().toISOString()}`;
      console.log(`Updating cw alarm ${item.monitorId} to value ${stateValue} with reason ${stateReason} (app=${item.app}, region=${item.region})`);
      await cw.setAlarmState({
        AlarmName: item.monitorId,
        StateReason: stateReason,
        StateValue: stateValue,
      }).promise();
    }
  };

  try {
    const response = await db.scan({ TableName: TABLE_NAME }).promise();
    const items: DbItem[] = response.Items as DbItem[];
    await setAlarms(items);
    return true;
  } catch (dbError) {
    return false;
  }
};

// Taken with modifications from https://www.tomas-dvorak.cz/posts/nodejs-request-without-dependencies/
const pingUrl = (url: string): Promise<boolean> => {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on requested url
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response: IncomingMessage) => {
      // handle http errors
      if (!response || !response.statusCode || response.statusCode < 200 || response.statusCode > 299) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    // handle connection errors of the request
    request.on('error', (_: any) => resolve(false));
  });
};
