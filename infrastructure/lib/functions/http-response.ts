export function httpResponse(body: any, statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  };
}

export function httpServerError(err: Error) {
  return httpResponse({ error: err.stack }, 500);
}

export function httpNotFoundError(itemId: string) {
  return httpResponse({ error: `item ${itemId} not found`, itemId }, 404);
}