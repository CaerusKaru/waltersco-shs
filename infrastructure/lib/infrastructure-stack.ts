import {App, Stack, StackProps} from '@aws-cdk/core';
import {join} from 'path';

import {ServiceHealthSystem} from './health-system';


/**
 * The infrastructure Cfn stack.
 */
export class InfrastructureStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteProps = {
      hostedZone: 'waltersco.co',
      domainName: 'status.waltersco.co',
      artifactSourcePath: join(__dirname, '..', '..', 'dist'),
    };

    new ServiceHealthSystem(this, 'SHS', {
      websiteProps,
    });
  }
}
