# AWS Profile Manager - Infrastructure

This folder contains the CloudFormation template for deploying AWS infrastructure with custom domain support.

## Architecture

The CloudFormation stack creates:

1. **S3 Bucket: Website** - Hosts React Vite build
2. **S3 Bucket: Binaries** - Hosts installers (`.dmg`, `.exe`, `.AppImage`)
3. **CloudFront Distribution** - CDN with custom domain and HTTPS
4. **Route53 A Record** - Points custom domain to CloudFront

## Prerequisites

### 1. AWS Account Setup
- AWS CLI installed and configured
- IAM user with appropriate permissions
- Route53 hosted zone for your domain

### 2. ACM Certificate (REQUIRED FIRST!)

**CRITICAL**: Certificate MUST be in `us-east-1` region for CloudFront.

```bash
# Request certificate
aws acm request-certificate \
  --domain-name downloads.yoursite.com \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
aws acm list-certificates --region us-east-1
```

Add the DNS validation record to Route53 and wait for validation:

```bash
# Check validation status
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-def \
  --region us-east-1 \
  --query 'Certificate.Status'
```

### 3. Route53 Hosted Zone

Get your hosted zone ID:

```bash
aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='yoursite.com.'].Id" \
  --output text
```

## Deployment

### Deploy the Stack

```bash
cd infrastructure

# Choose unique S3 bucket names (must be globally unique)
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name aws-profile-manager-infra \
  --parameter-overrides \
    ProjectName=aws-profile-manager \
    WebsiteBucketName=your-unique-website-bucket-name \
    BinariesBucketName=your-unique-binaries-bucket-name \
    DomainName=downloads.yoursite.com \
    HostedZoneId=Z1234567890ABC \
    CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc-def \
  --region us-east-1
```

### Get Stack Outputs

After deployment (takes 5-15 minutes):

```bash
aws cloudformation describe-stacks \
  --stack-name aws-profile-manager-infra \
  --query 'Stacks[0].Outputs' \
  --output table
```

Important outputs:
- `CloudFrontDistributionId` - For cache invalidation
- `CloudFrontDistributionDomainName` - CloudFront domain
- `WebsiteBucketName` - Website S3 bucket
- `BinariesBucketName` - Binaries S3 bucket
- `WebsiteURL` - Your custom domain URL

### Update GitHub Secrets

Configure these secrets in your GitHub repository (see `GITHUB_SECRETS.md`):

**Variables:**
- `AWS_REGION`

**Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `STACK_NAME` - Use the stack name from deployment
- `DOMAIN_NAME` - Your custom domain
- `HOSTED_ZONE_ID` - Route53 hosted zone ID
- `CERTIFICATE_ARN` - ACM certificate ARN

## Stack Management

### Update the Stack

If you modify the CloudFormation template:

```bash
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name aws-profile-manager-infra \
  --region us-east-1
```

### Delete the Stack

**WARNING:** This deletes all resources including S3 buckets!

```bash
# First, empty the S3 buckets
aws s3 rm s3://your-website-bucket-name --recursive
aws s3 rm s3://your-binaries-bucket-name --recursive

# Then delete the stack
aws cloudformation delete-stack --stack-name aws-profile-manager-infra

# Monitor deletion
aws cloudformation wait stack-delete-complete --stack-name aws-profile-manager-infra
```

## Resources Created

### S3 Buckets

**Website Bucket:**
- Public read access for website files
- Versioning enabled
- Lifecycle rule: Delete old versions after 30 days
- CORS enabled for web access

**Binaries Bucket:**
- Public read access for installers
- Versioning enabled
- Lifecycle rule: Delete old versions after 90 days
- CORS enabled

### CloudFront Distribution

**Features:**
- Custom domain with HTTPS (ACM certificate)
- Two origins: website and binaries
- Optimized caching policies
- SPA routing support (403/404 → index.html)
- Gzip compression enabled
- HTTP/2 and HTTP/3 support
- IPv6 enabled

**Cache Behaviors:**
- `/` - Website files (short cache for HTML)
- `/downloads/*` - Binary files (long cache)

### Route53

**A Record:**
- Points custom domain to CloudFront distribution
- Alias record (no charges for queries)

## Cost Estimation

Monthly costs (moderate traffic):
- **S3 Storage**: $0.023/GB (~$5-10 for binaries)
- **S3 Requests**: ~$0.01/month
- **CloudFront**: First 1TB free, then $0.085/GB
- **Route53**: $0.50/hosted zone + $0.40/million queries
- **ACM**: Free
- **Total**: ~$6-15/month for moderate traffic

## Troubleshooting

### Certificate Issues

**Problem:** "Certificate not found" error  
**Solution:** Ensure certificate is in `us-east-1` region

**Problem:** Certificate not validated  
**Solution:** Check DNS validation record in Route53

### S3 Bucket Name Already Exists

**Problem:** Bucket name taken  
**Solution:** S3 bucket names are globally unique. Choose different names.

### CloudFront Distribution Not Working

**Problem:** 403 Forbidden errors  
**Solution:** 
1. Wait 5-15 minutes for distribution to fully deploy
2. Check bucket policies allow public read access
3. Verify files were uploaded to S3

### DNS Not Resolving

**Problem:** Domain doesn't resolve  
**Solution:**
1. Wait for DNS propagation (up to 48 hours, usually minutes)
2. Verify Route53 A record exists
3. Check hosted zone is correct
4. Test with `dig downloads.yoursite.com`

### CloudFormation Stack Fails

**Problem:** Stack rollback on creation  
**Solution:**
1. Check CloudFormation Events for error details
2. Verify all parameters are correct
3. Ensure ACM certificate exists and is validated
4. Check S3 bucket names are unique

## Custom Domain Setup

Your custom domain will be automatically configured with:

1. **HTTPS** - ACM certificate
2. **CDN** - CloudFront global edge locations
3. **DNS** - Route53 A record

After deployment, your website will be available at:
- `https://downloads.yoursite.com/` - Website
- `https://downloads.yoursite.com/downloads/` - Installers

## Security

- All traffic forced to HTTPS
- S3 buckets configured with public read for necessary files only
- CloudFront uses modern TLS 1.2+
- Versioning enabled for rollback capability
- CloudFormation stack for infrastructure as code

## Monitoring

Monitor your distribution:

```bash
# CloudFront metrics
aws cloudfront get-distribution-config \
  --id YOUR-DISTRIBUTION-ID

# S3 bucket size
aws s3 ls s3://your-bucket-name --recursive --summarize --human-readable
```

## Additional Resources

- [CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Route53 Documentation](https://docs.aws.amazon.com/route53/)
- [ACM Documentation](https://docs.aws.amazon.com/acm/)
