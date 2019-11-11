import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import {App} from '@aws-cdk/core';
import {InfrastructureStack} from '../lib/infrastructure-stack';

test('Resources Created', () => {
  const app = new App();
  // WHEN
  const stack = new InfrastructureStack(app, 'MyTestStack', {
    env: {
      region: 'us-east-1',
      account: '12345',
    }
  });
  // THEN
  expectCDK(stack).to(haveResource('AWS::S3::Bucket'));
  expectCDK(stack).to(haveResource('AWS::ApiGateway::RestApi'));
  expectCDK(stack).to(haveResource('AWS::CloudFront::Distribution'));
  expectCDK(stack).to(haveResource('AWS::DynamoDB::Table'));
  expectCDK(stack).to(haveResource('AWS::Events::Rule'));
});
