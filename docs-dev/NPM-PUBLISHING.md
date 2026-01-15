# NPM Publishing Guide

## Pre-Publishing Checklist

### 1. Version Management

```bash
# Update version (choose one)
npm version patch  # 2.0.0 → 2.0.1
npm version minor  # 2.0.0 → 2.1.0
npm version major  # 2.0.0 → 3.0.0
```

### 2. Build & Test

```bash
# Run tests
npm run test:run

# Type check
npm run typecheck

# Lint
npm run lint

# Build frontend
npm run build

# Build API
npm run build:api
```

### 3. Test Locally

```bash
# Link package locally
npm link

# Test commands
email-automator --help
email-automator-setup
email-automator-deploy

# Unlink when done
npm unlink -g @realtimex/email-automator
```

### 4. Verify Package Contents

```bash
# Check what will be published
npm pack --dry-run

# This should include:
# - bin/
# - api/
# - src/
# - supabase/
# - scripts/
# - README.md
# - LICENSE
# - package.json
```

## Publishing

### First Time Setup

```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami
```

### Publish Package

```bash
# Publish as public package (scoped packages are private by default)
npm publish --access public

# Or for beta/alpha releases
npm publish --access public --tag beta
```

### Post-Publishing

```bash
# Verify publication
npm view @realtimex/email-automator

# Test installation
npx @realtimex/email-automator@latest --help
```

## Version Strategy

### Semantic Versioning

- **MAJOR** (3.0.0): Breaking changes
  - API changes
  - Architecture changes
  - Incompatible with previous versions

- **MINOR** (2.1.0): New features
  - New Edge Functions
  - New CLI commands
  - Backward compatible

- **PATCH** (2.0.1): Bug fixes
  - Bug fixes
  - Security patches
  - Performance improvements

### Pre-release Versions

```bash
# Alpha (early testing)
npm version prerelease --preid=alpha
# 2.0.0 → 2.0.1-alpha.0

# Beta (feature complete, testing)
npm version prerelease --preid=beta
# 2.0.0 → 2.0.1-beta.0

# Release Candidate
npm version prerelease --preid=rc
# 2.0.0 → 2.0.1-rc.0
```

## Package Metadata

Ensure package.json has:

```json
{
  "name": "@realtimex/email-automator",
  "version": "2.0.0",
  "description": "AI-powered email automation...",
  "keywords": ["email", "automation", "ai"],
  "author": "RealTimeX Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/therealtimex/email-automator.git"
  },
  "bugs": {
    "url": "https://github.com/therealtimex/email-automator/issues"
  },
  "homepage": "https://github.com/therealtimex/email-automator#readme"
}
```

## Distribution Tags

```bash
# Latest (default)
npm publish --access public --tag latest

# Beta releases
npm publish --access public --tag beta

# Users can install specific tags
npx @realtimex/email-automator@beta
```

## Unpublishing (Emergency Only)

```bash
# Unpublish specific version (within 72 hours)
npm unpublish @realtimex/email-automator@2.0.1

# ⚠️  NEVER unpublish entire package
# Use deprecate instead
npm deprecate @realtimex/email-automator@2.0.1 "Critical bug, use 2.0.2"
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/publish.yml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm test
      - run: npm run build
      
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Maintenance

### Regular Updates

```bash
# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Update to latest
npm update --save
```

### Security Audits

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Review and fix manually
npm audit fix --force
```

## Best Practices

1. **Always test before publishing**
   - Run `npm link` and test locally
   - Test all bin commands
   - Verify Edge Functions deploy

2. **Keep CHANGELOG.md updated**
   - Document all changes
   - Follow Keep a Changelog format

3. **Tag releases in Git**
   ```bash
   git tag v2.0.0
   git push --tags
   ```

4. **Announce updates**
   - GitHub Releases
   - Twitter/Social Media
   - RealTimeX Community

5. **Monitor downloads**
   - Check npm stats
   - Review issues
   - Respond to feedback

## Troubleshooting

### "You do not have permission to publish"

```bash
# Check if you're logged in
npm whoami

# Check package name availability
npm view @realtimex/email-automator

# Login again
npm login
```

### "Package name already exists"

- Change package name in package.json
- Or request ownership transfer

### "Files missing in published package"

- Check .npmignore
- Verify with `npm pack --dry-run`
- Ensure files listed in "files" array

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
