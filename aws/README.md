# AWS Profile Manager – Infrastructure

> **Disclaimer:** This is an unofficial, community-built tool. It is not affiliated with, endorsed by, or sponsored by Amazon Web Services (AWS) or Amazon.com, Inc.

This folder contains the CloudFormation template for the download website (S3 + CloudFront + custom domain). Application binaries are distributed via GitHub Releases.

## What it creates

- **S3 bucket (website)** — Static website (from `web/`).
- **CloudFront** — CDN with HTTPS for the website.
- **Route53** (optional) — A record so a custom domain points to CloudFront.

## Prerequisites

- AWS CLI configured.
- **ACM certificate** in **us-east-1** for your domain (e.g. `downloads.example.com`). Request and validate it first.
- **Route53 hosted zone** for that domain.

## Deploy (one-time)

From the repo root:

```bash
cd aws
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name aws-profile-manager-infra \
  --parameter-overrides \
    ProjectName=aws-profile-manager \
    WebsiteBucketName=YOUR-UNIQUE-WEBSITE-BUCKET \
    DomainName=downloads.example.com \
    HostedZoneId=Z0XXXXXXXX \
    CertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/ID \
  --region us-east-1
```

Use a globally unique S3 bucket name. Do not commit real bucket names or ARNs.

## After deploy

Get outputs (your URLs and IDs):

```bash
aws cloudformation describe-stacks \
  --stack-name aws-profile-manager-infra \
  --query 'Stacks[0].Outputs' \
  --output table
```

- **WebsiteURL** — Your download page (e.g. `https://downloads.example.com/`).
- **CloudFrontDistributionId** — For cache invalidation (e.g. in CI).
- **WebsiteBucketName** — For uploading the website.

## Installers

Application binaries (`.exe`, `.dmg`, `.AppImage`) are published automatically to GitHub Releases on every push to `main`. The website download buttons link directly to `https://github.com/shalev396/AWSProfileManager/releases/latest/download/...`.

## GitHub Actions

To have CI deploy the site, configure **Settings > Secrets and variables > Actions** with the secrets/vars your workflow expects (e.g. `STACK_NAME`, `AWS_ACCOUNT_ID`, OIDC). The workflow reads the bucket name and CloudFront ID from the stack; you do not need to put those in secrets.

## Delete the stack

Empty the S3 bucket, then:

```bash
aws cloudformation delete-stack --stack-name aws-profile-manager-infra
```
