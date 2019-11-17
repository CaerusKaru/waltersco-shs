/**
 * An individual monitor.
 */
export interface Item {
  app: string;
  region: string;
  endpoint: string;
}

/**
 * A monitor that has been stored in the database.
 */
export interface DbItem extends Item {
  monitorId: string;
}

/**
 * A monitor with its fetched status.
 */
export interface StatusDbItem extends DbItem {
  status: 'red' | 'green';
}
