import {Construct, RemovalPolicy} from '@aws-cdk/core';
import {Bucket} from '@aws-cdk/aws-s3';
import {BucketDeployment, Source} from '@aws-cdk/aws-s3-deployment';
import {DnsValidatedCertificate} from '@aws-cdk/aws-certificatemanager';
import {AaaaRecord, ARecord, HostedZone, RecordTarget, IHostedZone} from '@aws-cdk/aws-route53';
import {BucketWebsiteTarget, CloudFrontTarget} from '@aws-cdk/aws-route53-targets';
import {
  CfnCloudFrontOriginAccessIdentity,
  CfnDistribution,
  ViewerProtocolPolicy,
  PriceClass,
  HttpVersion,
  CloudFrontWebDistributionProps,
  CloudFrontAllowedMethods,
  SourceConfiguration,
  CloudFrontWebDistribution,
  Behavior
} from '@aws-cdk/aws-cloudfront';
import {CanonicalUserPrincipal, PolicyStatement, AccountRootPrincipal} from '@aws-cdk/aws-iam';

/**
 * Properties to configure the static website construct.
 */
export interface StaticWebsiteProps {
  /**
   * The hosted zone for the static website, e.g. example.com
   * @default no DNS; required with domainName
   */
  hostedZone?: IHostedZone;

  /**
   * The domain name for the static website, e.g. test.example.com
   * @default no DNS; required with hostedZone
   */
  domainName?: string;

  /**
   * Where the artifacts for the website are stored.
   */
  artifactSourcePath: string;

  /**
   * The root index for the static website, e.g. index.html
   * @default index.html
   */
  defaultFile?: string;

  /**
   * Whether to add SPA functionality to the CloudFront distribution
   * @default false
   */
  spa?: boolean;

  /**
   * Source configurations to set for the CloudFront distribution.
   * @default A default source configuration is always added
   */
  sourceConfigs?: SourceConfiguration[];

  /**
   * Error configurations to set for the CloudFront distribution.
   * @default none, unless spa also set to true
   */
  errorConfigs?: CfnDistribution.CustomErrorResponseProperty[];

  /**
   * Default behaviors to apply to the CloudFront distribution.
   * @default Compression on; GET, HEAD, and OPTIONS allowed methods
   */
  behaviors?: Behavior[];

  /**
   * The price class for the CLoudFront distribution.
   * @default price class 100
   * @see https://aws.amazon.com/cloudfront/pricing/
   */
  priceClass?: PriceClass;
}

/**
 * Exposes https://status.waltersco.co (https://status.waltersco.co/) based on result of a periodic (1 min) HTTP pings.
 * Uses S3, CloudFront, and Route53 to store and route to the website, and creates an ACM certificate.
 */
export class StaticWebsite extends Construct {
  readonly bucket: Bucket;
  readonly aRecord: ARecord;
  readonly aaaaRecord: AaaaRecord;
  readonly certificate: DnsValidatedCertificate;
  readonly originAccessIdentity: CfnCloudFrontOriginAccessIdentity;
  readonly distribution: CloudFrontWebDistribution;

  constructor(scope: Construct, name: string, props: StaticWebsiteProps) {
    super(scope, name);

    this.originAccessIdentity = new CfnCloudFrontOriginAccessIdentity(this, 'OAI', {
      cloudFrontOriginAccessIdentityConfig: {
        comment: 'OAI'
      }
    });
    const s3UserId = this.originAccessIdentity.attrS3CanonicalUserId;

    this.bucket = new Bucket(this, 'Bucket');
    this.bucket.grantRead(new CanonicalUserPrincipal(s3UserId));
    this.bucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ['s3:ListBucket'],
        principals: [new CanonicalUserPrincipal(s3UserId)],
        resources: [this.bucket.bucketArn]
      })
    );
    this.bucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ['s3:*'],
        principals: [new AccountRootPrincipal()],
        resources: [this.bucket.arnForObjects('*')]
      })
    );

    const sourceConfigs: SourceConfiguration[] = (props.sourceConfigs || [])
      .map((config: SourceConfiguration) => {
        const fixedConfig = {...config};
        if (!fixedConfig.s3OriginSource && !fixedConfig.customOriginSource) {
          fixedConfig.s3OriginSource = {
            originAccessIdentityId: this.originAccessIdentity.ref,
            s3BucketSource: this.bucket,
          };
          fixedConfig.originPath = config.originPath;
        }
        return fixedConfig as SourceConfiguration;
      });

    sourceConfigs.push(
      {
        s3OriginSource: {
          originAccessIdentityId: this.originAccessIdentity.ref,
          s3BucketSource: this.bucket
        },
        behaviors: props.behaviors ? props.behaviors : [
          {
            isDefaultBehavior: true,
            allowedMethods: CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
            compress: true,
          }
        ],
      });

    const resolvedDefaultFile = props.defaultFile || 'index.html';
    if (resolvedDefaultFile.startsWith('/')) {
      throw new Error(`Default file cannot start with a /. Got ${resolvedDefaultFile}`);
    }

    const errorConfigs: CfnDistribution.CustomErrorResponseProperty[] = [];
    if (props.errorConfigs) {
      errorConfigs.push(...props.errorConfigs);
    }

    if (props.spa) {
      errorConfigs.push({
        errorCode: 404,
        responseCode: 200,
        responsePagePath: `/${resolvedDefaultFile}`,
      });
    }

    const cloudFrontProps: CloudFrontWebDistributionProps = {
      defaultRootObject: resolvedDefaultFile,
      enableIpV6: true,
      httpVersion: HttpVersion.HTTP2,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      priceClass: props.priceClass || PriceClass.PRICE_CLASS_100,
      originConfigs: sourceConfigs,
      errorConfigurations: errorConfigs,
    };

    if (props.hostedZone && props.domainName) {

      this.certificate = new DnsValidatedCertificate(this, 'Certificate', {
        domainName: props.domainName,
        hostedZone: props.hostedZone,
        region: 'us-east-1',
      });

      this.distribution = new CloudFrontWebDistribution(this, 'SWCFDistribution', {
        ...cloudFrontProps,
        aliasConfiguration: {
          acmCertRef: this.certificate.certificateArn,
          names: [props.domainName]
        },
      });

      this.aRecord = new ARecord(this, 'Record', {
        recordName: props.domainName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
        zone: props.hostedZone
      });

      this.aaaaRecord = new AaaaRecord(this, 'AAAARecord', {
        recordName: props.domainName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
        zone: props.hostedZone
      });
    } else {
      this.distribution = new CloudFrontWebDistribution(this, 'SWCFDistribution', cloudFrontProps);
    }

    new BucketDeployment(this, 'DeployWebsite', {
      sources: [Source.asset(props.artifactSourcePath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
    });
  }
}
