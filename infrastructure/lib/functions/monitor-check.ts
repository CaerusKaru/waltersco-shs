import {IncomingMessage} from 'http';
import {DbItem} from './item';

const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
const TABLE_NAME = process.env.TABLE_NAME || '';

// TODO: update alarms! We need the API format here for the HTTP requests
export const handler = async (): Promise<any> => {

  const params = {
    TableName: TABLE_NAME
  };

  const setAlarms = async (items: DbItem[]) => {
    for (const item of items) {
      const status = await pingUrl(item.endpoint);
      await cw.setAlarmState({
        AlarmName: item.monitorId,
        StateValue: status ? 'OK' : 'ALARM',
      });
    }
  };

  try {
    const response = await db.scan(params).promise();
    const items: DbItem[] = response.Items;
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
  })
};
