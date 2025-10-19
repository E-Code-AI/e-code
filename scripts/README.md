# E-Code Scripts Documentation

## Codex PR Verification Script

Automatically verifies recent codex PRs for common issues and generates detailed audit reports.

### 🚀 Quick Start

**Analyze last 15 PRs (default):**
```bash
bash scripts/verify-codex-prs.sh
```

**Analyze specific number of PRs:**
```bash
bash scripts/verify-codex-prs.sh 5    # Last 5 PRs
bash scripts/verify-codex-prs.sh 20   # Last 20 PRs
bash scripts/verify-codex-prs.sh 30   # Last 30 PRs
```

### 📋 What It Checks

The script performs 7 comprehensive checks:

1. **Git History** - Analyzes recent codex merge commits
2. **Database Tables** - Verifies all schema tables exist in database
3. **Port Status** - Checks if required ports (3200, 5000, 8080, 8081) are active
4. **Pending Migrations** - Lists unapplied SQL migration files
5. **TypeScript Compilation** - Checks for compilation errors
6. **Code Duplications** - Scans for duplicate functions in test files
7. **Application Health** - Tests if the application is responding

### 📊 Output

The script provides:
- **Console output** with color-coded status (✓ green, ✗ red, ⚠ yellow)
- **Audit report** saved to `reports/codex-audits/audit_TIMESTAMP.md`
- **Exit code** (0 = success, >0 = number of issues found)

### 📝 Sample Output

```
========================================
  E-Code Codex PR Verification
  Analyzing last 15 PRs
========================================

[1/7] Checking Git history...
  Found 15 recent codex PRs

[2/7] Verifying database tables...
  ✓ Table exists: users
  ✓ Table exists: projects
  ✓ Table exists: customer_requests
  ✗ Missing table: prompt_templates

[3/7] Checking port conflicts...
  ✓ Port 3200 in use (expected)
  ✓ Port 5000 in use (expected)
  ✓ Port 8080 in use (expected)
  ✓ Port 8081 in use (expected)

[4/7] Checking for unapplied migrations...
  Found migration: 20251020_add_customer_requests_table

[5/7] Checking TypeScript compilation...
  ✓ No TypeScript errors

[6/7] Scanning for code duplications...
  ✓ No duplicate functions detected

[7/7] Verifying application health...
  ✓ Application is responding

========================================
  Verification Complete
========================================

⚠️  ISSUES FOUND: 1

📄 Full report: reports/codex-audits/audit_20251019_143000.md
```

### 🔧 Fixing Common Issues

**Missing database tables:**
```bash
npm run db:push --force
```

**Port conflicts:**
```bash
fuser -k 3200/tcp  # Kill process on port 3200
fuser -k 5000/tcp  # Kill process on port 5000
```

**Unapplied migrations:**
```bash
psql $DATABASE_URL -f server/db/migrations/YOUR_MIGRATION.sql
```

**TypeScript errors:**
```bash
npx tsc --noEmit  # See full error list
```

### 📂 Report Structure

Reports are saved in `reports/codex-audits/` with timestamped filenames:
```
reports/codex-audits/
├── audit_20251019_143000.md
├── audit_20251019_150000.md
└── audit_20251019_160000.md
```

Each report includes:
- Summary of issues found
- Detailed breakdown by category
- Recommendations for fixes
- Statistics (clean rate, total issues, etc.)

### ⚙️ Configuration

You can modify the script to change:
- Default number of PRs to analyze (line 14)
- Required ports to check (line 79)
- Report directory location (line 12)

### 🔄 CI/CD Integration

Add to your CI pipeline:

**GitHub Actions:**
```yaml
- name: Verify Codex PRs
  run: bash scripts/verify-codex-prs.sh
```

**Pre-commit hook:**
```bash
# .git/hooks/pre-commit
#!/bin/bash
bash scripts/verify-codex-prs.sh 5 || exit 1
```

### 🐛 Troubleshooting

**Script not executable:**
```bash
chmod +x scripts/verify-codex-prs.sh
```

**Missing dependencies:**
```bash
# Ensure you have these installed:
# - git
# - psql (PostgreSQL client)
# - curl
# - npx (comes with Node.js)
```

**Database connection issues:**
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL
```

### 📚 Related Scripts

- `npm run test` - Run test suite
- `npm run typecheck` - TypeScript type checking
- `npm run db:push` - Sync database schema

---

**Created**: October 19, 2025  
**Maintained by**: E-Code Platform Team
