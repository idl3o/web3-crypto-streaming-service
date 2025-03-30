# GitHub Packages Integration Guide

This document explains how to use GitHub Packages with the Web3 Crypto Streaming Service.

## Setup

The project is configured to publish to and install packages from GitHub Packages. To use GitHub Packages, you need:

1. A GitHub account
2. A Personal Access Token (classic) with the appropriate scopes
3. Proper configuration in your `.npmrc` files

## Authentication

### Creating a Personal Access Token (PAT)

1. Log in to GitHub
2. Go to Settings > Developer settings > Personal access tokens > Generate new token (classic)
3. Select at least the following scopes:
   - `repo` (Full control of private repositories)
   - `read:packages` (Download packages from GitHub Package Registry)
   - `write:packages` (Upload packages to GitHub Package Registry)
4. Generate the token and save it securely

### Setting Up Authentication

You can set up authentication in two ways:

#### Option 1: Setup Script

Run our setup script:

```bash
npm run setup:github-registry
```

This will prompt you for your GitHub username and personal access token, then set up all required configuration.

#### Option 2: Manual Configuration

1. Create or edit a project-level `.npmrc` file:

```
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

2. Add your token to your `.env` file:

```
NPM_TOKEN=your_personal_access_token
```

3. Optionally, update your global `~/.npmrc` file:

```
@YOUR_GITHUB_USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=your_personal_access_token
```

## Publishing Packages

The package is configured with the proper `publishConfig` in `package.json`:

```json
"publishConfig": {
  "registry": "https://npm.pkg.github.com"
}
```

To publish:

1. Make sure your package name in `package.json` follows the format `@username/package-name` or `@org-name/package-name`
2. Run:

```bash
npm publish
```

3. For a dry run (without actual publishing):

```bash
npm publish --dry-run
```

## Installing Packages from GitHub Packages

To install packages from GitHub Packages:

1. Make sure your `.npmrc` file is properly configured
2. Install packages as usual:

```bash
npm install @namespace/package-name
```

## CI/CD Integration

For GitHub Actions workflows, use the `GITHUB_TOKEN` secret:

```yaml
steps:
  - uses: actions/checkout@v2
  - uses: actions/setup-node@v2
    with:
      node-version: '16.x'
      registry-url: 'https://npm.pkg.github.com'
      scope: '@your-org-name'
  - run: npm ci
  - run: npm publish
    env:
      NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Troubleshooting

- **403 Forbidden errors**: Check that your token has the correct permissions
- **404 Not Found errors**: Ensure the package exists and you have access to it
- **Package name issues**: Ensure your package name follows the `@namespace/package-name` format
- **Token issues**: Make sure your token is correctly set in your `.npmrc` file
