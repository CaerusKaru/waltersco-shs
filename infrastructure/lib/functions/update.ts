import AWS = require('aws-sdk');
import { httpNotFoundError, httpResponse, httpServerError } from './http-response';
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

export const handler = async (event: any = {}): Promise <any> => {
  if (!event.body) {
    return httpResponse('invalid request, you are missing the parameter body', 400);
  }

  const editedItemId = event.pathParameters.id;
  if (!editedItemId) {
    return httpResponse({ error: 'invalid request, you are missing the path parameter id' }, 400);
  }

  const editedItem: any = (typeof event.body === 'object' ? event.body : JSON.parse(event.body)) || { };

  if (Object.keys(editedItem).length === 0) {
    return httpResponse({ error: 'invalid request, no arguments provided' }, 400);
  }

  const updates = new Array<string>();
  const attrValues: AWS.DynamoDB.DocumentClient.ExpressionAttributeValueMap = { };
  const attrNames: AWS.DynamoDB.DocumentClient.ExpressionAttributeNameMap = { };

  let attrIndex = 0;
  for (const [ name, value ] of Object.entries(editedItem)) {
    const attrValue = `:attr${attrIndex}`;
    const attrName = `#attr${attrIndex}`;
    updates.push(`${attrName} = ${attrValue}`);
    attrValues[attrValue] = value;
    attrNames[attrName] = `${name}`;

    attrIndex++;
  }

  const params: AWS.DynamoDB.DocumentClient.UpdateItemInput = {
    TableName: TABLE_NAME,
    Key: {
      [PRIMARY_KEY]: editedItemId
    },
    UpdateExpression: `set ` + updates.join(', '),
    ExpressionAttributeValues: attrValues,
    ExpressionAttributeNames: attrNames,
    ConditionExpression: `attribute_exists(${PRIMARY_KEY})`,
    ReturnValues: 'ALL_NEW'
  };

  try {
    const ret = await db.update(params).promise();
    return httpResponse(ret.Attributes, 200);
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return httpNotFoundError(editedItemId);
    }
    return httpServerError(error);
  }
};
