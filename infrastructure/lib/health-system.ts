import {Construct, Stack} from '@aws-cdk/core';
import {join} from 'path';

import { IHostedZone } from '@aws-cdk/aws-route53';
import {Api} from './api';
import {MonitorCheck} from './monitor';
import {StaticWebsite} from './static-website';
import {Source} from '@aws-cdk/aws-s3-deployment';

/**
 * Properties for the Service Health System.
 */
export interface ServiceHealthSystemProps {
  readonly hostedZone?: IHostedZone;
  readonly websiteDomainName?: string;
  readonly apiDomainName?: string;
}

/**
 * The WaltersCo Service Health System (SHS) is a centralized internal service which continuously monitors all our
 * service endpoints and exposes https://status.waltersco.co (https://status.waltersco.co/) based on result of a
 * periodic (1 min) HTTP pings.
 */
export class ServiceHealthSystem extends Construct {
  public readonly api: Api;
  public readonly monitor: MonitorCheck;
  public readonly website: StaticWebsite;

  constructor(parent: Stack, name: string, props: ServiceHealthSystemProps = { }) {
    super(parent, name);

    // Create the backend API
    this.api = new Api(this, 'Api', {
      hostedZone: props.hostedZone,
      domainName: props.apiDomainName,
    });

    // Create the monitor update rule
    this.monitor = new MonitorCheck(this, 'Monitor', {
      table: this.api.table,
    });

    // Create the static website
    this.website = new StaticWebsite(this, 'StaticWebsite', {
      hostedZone: props.hostedZone,
      domainName: props.websiteDomainName,
      artifactSourcePath: Source.asset(join(__dirname, '..', '..', 'dist', 'waltersco-shs')),
    });
  }
}
