# Cleanup and Maintenance Guide

This guide provides instructions for maintaining a clean and efficient development environment for the e-code project.

## Automated Cleanup Scripts

The project includes several cleanup scripts accessible via npm:

```bash
# Complete cleanup (dependencies, build artifacts, cache)
npm run cleanup

# Clean dependencies only
npm run cleanup:deps

# Clean build artifacts only
npm run cleanup:build

# Clean npm cache only
npm run cleanup:cache
```

## Manual Cleanup Tasks

### 1. Dependencies Cleanup

#### Remove Unused Dependencies
```bash
# Install depcheck to find unused dependencies
npm install -g depcheck

# Run analysis
depcheck

# Remove unused packages
npm uninstall package-name
```

#### Update Outdated Dependencies
```bash
# Check for outdated packages
npm outdated

# Update all dependencies (be careful with major version changes)
npm update

# Update a specific package
npm install package-name@latest
```

#### Clean Node Modules
```bash
# Remove and reinstall all dependencies
rm -rf node_modules package-lock.json
npm install

# Or use the convenience script
npm run cleanup:deps
```

### 2. Build Artifacts Cleanup

#### Remove Build Outputs
```bash
# Remove all build outputs
rm -rf dist/ storybook-static/

# Or use the convenience script
npm run cleanup:build
```

#### Clear Vite Cache
```bash
# Remove Vite cache
rm -rf node_modules/.vite/
```

### 3. Development Environment Cleanup

#### Clear TypeScript Build Info
```bash
# Remove TypeScript incremental build info
rm -rf node_modules/typescript/tsbuildinfo
```

#### Reset Git State (if needed)
```bash
# Remove untracked files
git clean -fd

# Reset to last commit (destructive!)
git reset --hard HEAD
```

### 4. Docker Environment Cleanup

#### Remove Docker Images and Containers
```bash
# Remove project containers
docker-compose down --rmi all --volumes --remove-orphans

# Remove unused Docker images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### 5. IDE and Editor Cleanup

#### VS Code
```bash
# Remove VS Code workspace settings (if corrupted)
rm -rf .vscode/settings.json

# Clear VS Code extension cache
rm -rf ~/.vscode/extensions/*/cache/
```

#### Remove Editor Artifacts
```bash
# Remove common editor temporary files
find . -name ".DS_Store" -delete
find . -name "Thumbs.db" -delete
find . -name "*.swp" -delete
find . -name "*.swo" -delete
```

### 6. Log Files Cleanup

#### Clear Application Logs
```bash
# Remove log files (adjust paths as needed)
rm -rf logs/
rm -f *.log
```

#### Clear System Logs (macOS/Linux)
```bash
# Clear npm logs
rm -rf ~/.npm/_logs/

# Clear yarn logs (if used)
rm -rf ~/.yarn/global/node_modules/.cache/
```

## Scheduled Maintenance Tasks

### Weekly
- [ ] Run dependency audit: `npm run audit:deps`
- [ ] Check for outdated packages: `npm outdated`
- [ ] Review and update environment variables
- [ ] Clear development caches: `npm run cleanup:cache`

### Monthly
- [ ] Update minor dependencies: `npm update`
- [ ] Review and remove unused dependencies
- [ ] Clean Docker images and volumes
- [ ] Review and update documentation

### Quarterly
- [ ] Major dependency updates (with testing)
- [ ] Security audit and updates
- [ ] Review and optimize build configuration
- [ ] Database cleanup and optimization

## Troubleshooting Common Issues

### Node.js Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or run specific commands with more memory
node --max-old-space-size=4096 node_modules/.bin/tsc
```

### Package Lock Conflicts
```bash
# Remove lock file and reinstall
rm package-lock.json
npm install

# Or use npm ci for clean install
npm ci
```

### TypeScript Build Issues
```bash
# Clear TypeScript cache and rebuild
npm run cleanup:build
rm -rf node_modules/.cache/
npm run build
```

### Port Conflicts
```bash
# Find processes using ports
lsof -i :3000
lsof -i :6006

# Kill processes if needed
kill -9 <PID>
```

### Git Issues
```bash
# Reset to clean state (destructive!)
git stash
git clean -fd
git reset --hard HEAD

# Or create a new branch and start fresh
git checkout -b fresh-start
```

## Best Practices

### 1. Regular Maintenance
- Run cleanup scripts regularly to prevent accumulation of artifacts
- Keep dependencies updated to avoid security vulnerabilities
- Monitor disk space usage in development environments

### 2. Version Control
- Never commit `node_modules/`, `dist/`, or cache directories
- Keep `.gitignore` updated with new build artifacts
- Use `.gitattributes` for consistent line endings

### 3. Development Environment
- Use consistent Node.js versions across team (consider `.nvmrc`)
- Document any manual setup steps required
- Keep development tools updated

### 4. Monitoring
- Set up alerts for dependency vulnerabilities
- Monitor build times and optimize when necessary
- Track bundle size and performance metrics

## Emergency Recovery

If your development environment becomes completely corrupted:

1. **Full Reset**:
   ```bash
   # Save your work first!
   git stash
   
   # Complete cleanup
   npm run cleanup
   rm -rf .git/index.lock
   git reset --hard HEAD
   git clean -fd
   
   # Reinstall everything
   npm install
   npm run build
   ```

2. **Start Fresh**:
   ```bash
   # Clone the repository again
   cd ..
   git clone <repository-url> e-code-fresh
   cd e-code-fresh
   npm install
   ```

Remember to always backup important work before running destructive cleanup commands!