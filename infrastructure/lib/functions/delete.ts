import AWS = require('aws-sdk');
import { httpResponse } from './http-response';
const db = new AWS.DynamoDB.DocumentClient();
const cw = new AWS.CloudWatch();
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

export const handler = async (event: any = {}): Promise <any> => {

  const requestedItemId = event.pathParameters.id;
  if (!requestedItemId) {
    return httpResponse({ error: 'You are missing the path parameter id' }, 400);
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PRIMARY_KEY]: requestedItemId
    }
  };

  try {
    await db.delete(params).promise();
    await cw.deleteAlarms({
      AlarmNames: [requestedItemId],
    });
    return httpResponse({ [PRIMARY_KEY]: requestedItemId });
  } catch (error) {
    return httpResponse({ error: error.stack }, 500);
  }
};
