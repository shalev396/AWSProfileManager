# AWS Profile Manager

Desktop app to manage AWS CLI profiles with a static website for downloads. Switch between multiple AWS accounts from your system tray without using `--profile` flags.

**Supported platforms:** Windows, macOS (Intel and Apple Silicon), and Linux.

## Project Structure

This project consists of three main parts:

```
AWSProfileManager/
├── electron/          # Desktop application (Electron + React); workflows expect this path
├── web/               # Static download website; workflows expect this path
├── aws/                   # CloudFormation template and infra docs
└── .github/workflows/     # CI/CD pipelines
```

### Electron App

The desktop application located in `electron-app/` folder. Built with Electron, React, and TypeScript.

**Features:**

- 🔄 Quick switching between AWS profiles from system tray
- 🎨 Custom logos for each account
- 🔒 Secure storage using standard AWS credentials files
- ⚡ No need for `--profile` flags in CLI commands
- 💾 Automatic backups of credentials files

### Website

Static website in `website/` folder for hosting download links. Deployed to AWS S3 + CloudFront.

### Infrastructure

CloudFormation template in `aws/` folder creates:

- S3 bucket for website hosting
- S3 bucket for binary files (installers)
- CloudFront distribution for both

## Development

### Prerequisites

- **Node.js 18+** ([download](https://nodejs.org/))
- For deployment: AWS CLI and AWS account

### Running the Electron App

```bash
cd electron-app
npm install
npm run dev
```

### Building for Production

```bash
cd electron-app

# Build for your current platform
npm run package

# Or build for specific platforms
npm run package:mac      # macOS
npm run package:win      # Windows
npm run package:linux    # Linux
```

Built installers will be in `electron-app/dist/`.

## Deployment

See **How to deploy** and **Required GitHub configuration** below. Workflows get bucket names and CloudFront ID from the stack at runtime (no bucket names in secrets).

---

## How to deploy

1. **Prerequisites**  
   AWS CLI, Route53 hosted zone, and an ACM certificate in **us-east-1** for your domain (e.g. `downloads.example.com`).

2. **Deploy CloudFormation** (from repo root):

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

   Use globally unique S3 bucket names. Never commit real bucket names or ARNs.

3. **Configure GitHub**  
   In the repo: **Settings → Secrets and variables → Actions**. Add the variables and secrets listed in **Required GitHub configuration** below. Use OIDC (no access keys); ensure the IAM role `my-github-actions-role` exists and trusts your repo.

4. **CI/CD**  
   Push to `main`: website deploy runs when `website/` changes; Electron build runs on every push and uploads to S3. On tags `v*`, a GitHub Release is created. Bucket names and CloudFront ID are read from the stack; do not put them in secrets.

**Workflows:** `.github/workflows/build-electron.yml` (Mac/Windows/Linux + S3 upload), `.github/workflows/deploy-website.yml` (website to S3 + cache invalidation).

---

## Platform-Specific Notes

### Windows

1. The app appears in the **system tray** (bottom right).
2. Click the tray icon → **Manage Accounts…** to add or edit profiles.
3. Credentials stored in `%USERPROFILE%\.aws\`

### macOS

1. The app appears in the **menu bar** (top right).
2. Closing the window only hides it; use the tray icon to reopen.
3. Credentials stored in `~/.aws/`
4. You may need to allow the app in System Preferences → Security & Privacy

### Linux

1. The app uses the system tray if your environment supports it.
2. App data: `~/.config/aws-profile-manager/`
3. AWS files: `~/.aws/credentials` and `~/.aws/config`
4. Make AppImage executable: `chmod +x AWS-Profile-Manager*.AppImage`

## Data Locations

- **App data** (accounts, logos): Platform-specific locations shown in the app
- **AWS credentials**: `~/.aws/credentials` and `~/.aws/config` (with `.bak` backups)

## CI/CD Pipeline

The project uses GitHub Actions for automated builds and deployments:

### Build Pipeline (build-electron.yml)

Triggers on:

- Push to `main` branch
- Version tags (e.g., `v1.0.0`)

Jobs:

1. **build-mac** - Builds `.dmg` on macOS runner
2. **build-windows** - Builds `.exe` on Windows runner
3. **build-linux** - Builds `.AppImage` on Ubuntu runner
4. **create-release** - Creates GitHub release with all installers (on tags)

Each job uploads the installer to S3 in the appropriate folder structure:

```
s3://binaries-bucket/
├── downloads/
│   ├── v1.0.0/
│   │   ├── mac/*.dmg
│   │   ├── win/*.exe
│   │   └── linux/*.AppImage
│   └── latest/
│       ├── mac/*.dmg
│       ├── win/*.exe
│       └── linux/*.AppImage
```

### Website Deployment (deploy-website.yml)

Triggers on:

- Push to `main` branch (when `website/` folder changes)

Steps:

1. Syncs `website/` folder to S3 website bucket
2. Invalidates CloudFront cache
3. Outputs the website URL

## Cost Estimates

Estimated AWS costs (low traffic):

- S3 storage: ~$2-5/month
- CloudFront: First 1TB free, then $0.085/GB
- **Total**: ~$5-10/month for moderate traffic

---

## Required GitHub configuration

Add these in the repo: **Settings → Secrets and variables → Actions**. The pipelines use OIDC (no access keys); bucket names and CloudFront ID come from CloudFormation at runtime.

**Variables** (Settings → Actions → Variables):

| Name         | Example     | Description                        |
| ------------ | ----------- | ---------------------------------- |
| `AWS_REGION` | `us-east-1` | Region where the stack is deployed |

**Secrets** (Settings → Actions → Secrets):

| Name             | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID (used in OIDC role ARN)        |
| `STACK_NAME`     | CloudFormation stack name, e.g. `aws-profile-manager-infra` |

You do **not** need: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `WEBSITE_BUCKET_NAME`, `BINARIES_BUCKET_NAME`, or `CLOUDFRONT_DISTRIBUTION_ID` — workflows get those from the stack.

## License

MIT License - see electron-app folder for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

- Report issues: [GitHub Issues](https://github.com/shalev396/AWSProfileManager/issues)
- View source: [GitHub Repository](https://github.com/shalev396/AWSProfileManager)
