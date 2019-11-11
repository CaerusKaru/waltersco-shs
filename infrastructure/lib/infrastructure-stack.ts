import { HostedZone } from '@aws-cdk/aws-route53';
import {App, Stack, StackProps} from '@aws-cdk/core';
import {ServiceHealthSystem} from './health-system';

/**
 * The infrastructure Cfn stack.
 */
export class InfrastructureStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const domainRoot = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'waltersco.co',
      privateZone: false
    });

    new ServiceHealthSystem(this, 'SHS', {
      hostedZone: domainRoot,
      websiteDomainName: 'status.waltersco.co',
      apiDomainName: 'status-api.waltersco.co',
    });
  }
}
