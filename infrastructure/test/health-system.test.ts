import {App, Stack} from '@aws-cdk/core';
import {expect as expectCDK, haveResource} from '@aws-cdk/assert';
import {join} from 'path';

import {ServiceHealthSystem} from '../lib/health-system';


// This is basically a duplicate of infrastructure.test, mostly because that's
// just a wrapper over this construct
test('HealthSystem', () => {
  // WHEN
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      region: 'us-east-1',
      account: '12345',
    },
  });
  new ServiceHealthSystem(stack, 'HS', {
    websiteProps: {
      artifactSourcePath: join(__dirname, 'dist'),
    }
  });
  // THEN
  expectCDK(stack).to(haveResource('AWS::S3::Bucket'));
  expectCDK(stack).to(haveResource('AWS::ApiGateway::RestApi'));
  expectCDK(stack).to(haveResource('AWS::CloudFront::Distribution'));
  expectCDK(stack).to(haveResource('AWS::DynamoDB::Table'));
  expectCDK(stack).to(haveResource('AWS::Events::Rule'));
});
