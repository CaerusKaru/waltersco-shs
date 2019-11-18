/**
 * An individual monitor.
 */
export interface MonitorConfiguration {
  app: string;
  region: string;
  endpoint: string;
}

/**
 * A monitor that has been stored in the database.
 */
export interface Monitor extends MonitorConfiguration {
  monitorId: string;
}

/**
 * A monitor with its fetched status.
 */
export interface MonitorWithStatus extends Monitor {
  status: 'red' | 'green';
}
