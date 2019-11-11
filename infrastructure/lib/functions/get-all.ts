import {DbItem, StatusDbItem} from './item';

const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler = async (): Promise<any> => {

  const params = {
    TableName: TABLE_NAME
  };

  const getAlarms = async (items: DbItem[]): Promise<StatusDbItem[]> => {
    try {
      const alarms = await cw.describeAlarms({
        AlarmNames: [items.map(item => item.monitorId)],
      }).promise();
      return items.map((item, i) => {
        const alarm = alarms[i];
        return {
          ...item,
          status: alarm.StateValue === 'OK' ? 'green' : 'red',
        }
      })
    } catch (cwError) {
      return items.map(item => ({
        ...item,
        status: 'red',
      }));
    }
  };

  try {
    const response = await db.scan(params).promise();
    const items: DbItem[] = response.Items;
    const statusItems: StatusDbItem[] = await getAlarms(items);

    return {
      statusCode: 200,
      body: JSON.stringify(statusItems),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  } catch (dbError) {
    return {
      statusCode: 500,
      body: JSON.stringify(dbError),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};
