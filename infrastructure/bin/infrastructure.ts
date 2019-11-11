#!/usr/bin/env node
import {App} from '@aws-cdk/core';
import {InfrastructureStack} from '../lib/infrastructure-stack';

const app = new App();
new InfrastructureStack(app, 'waltersco-service-health-system', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
