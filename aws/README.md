# AWS Profile Manager – Infrastructure

This folder contains the CloudFormation template for the download website and installers (S3 + CloudFront + optional custom domain).

## What it creates

- **S3 bucket (website)** — Static website (from `web/`).
- **S3 bucket (binaries)** — Installers (`.exe`, `.dmg`, `.AppImage`).
- **CloudFront** — CDN with HTTPS. Your download page and install links use this.
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
    BinariesBucketName=YOUR-UNIQUE-BINARIES-BUCKET \
    DomainName=downloads.example.com \
    HostedZoneId=Z0XXXXXXXX \
    CertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/ID \
  --region us-east-1
```

Use globally unique S3 bucket names. Do not commit real bucket names or ARNs.

## After deploy

Get outputs (your URLs and IDs):

```bash
aws cloudformation describe-stacks \
  --stack-name aws-profile-manager-infra \
  --query 'Stacks[0].Outputs' \
  --output table
```

- **WebsiteURL** — Your download page (e.g. `https://downloads.example.com/`).
- **DownloadsURL** — Installers base path (e.g. `https://downloads.example.com/downloads/`).
- **CloudFrontDistributionId** — For cache invalidation (e.g. in CI).
- **WebsiteBucketName**, **BinariesBucketName** — For uploading website and installers.

## Using the download page

Once the stack is deployed and the website/installers are uploaded (by your CI or manually), users can install the app from:

**Your download page:** `https://YOUR-DOMAIN/` (replace with the **WebsiteURL** from the stack outputs).

Links on that page point to `/downloads/mac/`, `/downloads/win/`, `/downloads/linux/` for the installers.

## GitHub Actions

To have CI deploy the site and upload installers, configure **Settings → Secrets and variables → Actions** with the secrets/vars your workflow expects (e.g. `STACK_NAME`, `AWS_ACCOUNT_ID`, OIDC). The workflows read bucket names and CloudFront ID from the stack; you do not need to put those in secrets.

## Delete the stack

Empty the S3 buckets, then:

```bash
aws cloudformation delete-stack --stack-name aws-profile-manager-infra
```
