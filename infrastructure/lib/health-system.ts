import {Construct, Stack} from '@aws-cdk/core';

import {Api} from './api';
import {StaticWebsite, StaticWebsiteProps} from './static-website';
import * as path from 'path';
import {MonitorCheck} from './monitor';

/**
 * Properties for the Service Health System.
 */
export interface ServiceHealthSystemProps {
  /**
   * Properties to configure the static website that backs the SHS.
   */
  websiteProps: StaticWebsiteProps;
}

/**
 * The WaltersCo Service Health System (SHS) is a centralized internal service which continuously monitors all our
 * service endpoints and exposes https://status.waltersco.co (https://status.waltersco.co/) based on result of a
 * periodic (1 min) HTTP pings.
 */
export class ServiceHealthSystem extends Construct {
  readonly api: Api;
  readonly monitor: MonitorCheck;
  readonly website: StaticWebsite;

  constructor(parent: Stack, name: string, props: ServiceHealthSystemProps) {
    super(parent, name);

    // Create the backend API
    this.api = new Api(this, 'Api');

    // Create the monitor update rule
    this.monitor = new MonitorCheck(this, 'Monitor', {
      table: this.api.table,
    });

    // Create the static website
    this.website = new StaticWebsite(this, 'StaticWebsite', props.websiteProps);
  }
}
