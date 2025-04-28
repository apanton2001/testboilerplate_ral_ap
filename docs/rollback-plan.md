# ASYCUDA Autofill Rollback Plan

This document outlines the procedures for rolling back deployments in case of issues. It provides step-by-step instructions for different rollback scenarios and defines the criteria for making rollback decisions.

## Rollback Decision Criteria

### Critical Issues (Immediate Rollback Required)

- **Data Corruption**: Any issue causing data loss or corruption
- **Security Vulnerability**: Discovered security issues that expose user data
- **Complete Service Outage**: Application is completely non-functional
- **Authentication Failure**: Users unable to log in
- **Classification Accuracy < 95%**: Critical functionality degradation

### Major Issues (Rollback After Brief Troubleshooting)

- **Performance Degradation**: Load time > 5s or classification time > 10s
- **Partial Feature Unavailability**: Key features like export not working
- **UI Rendering Issues**: Major visual problems affecting usability
- **Integration Failures**: API connections to ContextGem failing consistently

### Minor Issues (Fix Forward)

- **Cosmetic UI Issues**: Visual glitches not affecting functionality
- **Non-critical Feature Bugs**: Issues in secondary features
- **Performance Slowdowns < 20%**: Minor performance degradation
- **Isolated Edge Cases**: Issues affecting very specific user scenarios

## Rollback Procedures

### 1. Vercel Deployment Rollback

#### Automatic Rollback via GitHub Actions

```yaml
# This will be triggered automatically if smoke tests fail
name: Auto-Rollback
on:
  workflow_run:
    workflows: ["Deploy"]
    types:
      - completed

jobs:
  auto-rollback:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Rollback to previous deployment
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod --force'
```

#### Manual Rollback Steps

1. Log in to the Vercel dashboard
2. Navigate to the ASYCUDA Autofill project
3. Go to "Deployments" tab
4. Find the last stable deployment
5. Click the three dots menu (⋮) and select "Promote to Production"
6. Confirm the rollback

### 2. Database Rollback

#### Prisma Migration Rollback

```bash
# Roll back to a specific migration
npx prisma migrate resolve --rolled-back "20250428000000_add_user_preferences"

# Then apply the previous migration
npx prisma migrate resolve --applied "20250427000000_previous_migration"
```

#### Manual Database Restore

1. Access the database management console
2. Restore from the latest backup before the problematic deployment
3. Verify data integrity after restore
4. Update connection strings if necessary

### 3. API Configuration Rollback

1. Revert API rate limiting settings:
   ```bash
   # Restore previous API configuration
   cp config/api-config.backup.json config/api-config.json
   ```

2. Restore previous environment variables:
   - Log in to Vercel dashboard
   - Navigate to project settings
   - Go to "Environment Variables" tab
   - Restore from backup or manually revert changes

## Communication Plan During Rollbacks

### Internal Communication

1. Post alert in #deployments Slack channel
2. Tag @deployment-team for immediate attention
3. Create incident report in tracking system
4. Schedule post-mortem meeting after resolution

### External Communication (If Service Disruption > 5 minutes)

1. Update status page at status.asycuda-autofill.com
2. Send email notification to registered users
3. Post notice on login page
4. Provide estimated resolution time if known

## Post-Rollback Actions

1. **Investigate Root Cause**:
   - Review logs and monitoring data
   - Identify the specific change that caused the issue
   - Document findings in incident report

2. **Fix Issues**:
   - Create tickets for identified issues
   - Prioritize fixes based on severity
   - Implement additional tests to prevent recurrence

3. **Improve Process**:
   - Update deployment checklist based on lessons learned
   - Enhance automated tests to catch similar issues
   - Review and improve monitoring alerts

4. **Validate Fix**:
   - Test fixes in development and staging environments
   - Perform targeted testing on affected components
   - Schedule new deployment with additional monitoring

## Rollback Testing

The rollback procedures should be tested regularly:

- Quarterly simulated rollback drills
- Include rollback testing in deployment planning
- Validate backup and restore procedures monthly

## Contact Information

### Primary Contacts

- **DevOps Lead**: [Name] - [Phone] - [Email]
- **Backend Lead**: [Name] - [Phone] - [Email]
- **Frontend Lead**: [Name] - [Phone] - [Email]
- **Database Admin**: [Name] - [Phone] - [Email]

### Escalation Path

1. On-call Engineer
2. Technical Lead
3. Engineering Manager
4. CTO

## Appendix: Rollback Command Reference

### Vercel CLI Rollback

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel promote <deployment-id>
```

### Git Rollback

```bash
# Revert the last commit
git revert HEAD

# Revert to specific commit
git revert <commit-hash>

# Push revert
git push origin main
```

### Database Backup/Restore

```bash
# Backup PostgreSQL database
pg_dump -U username -d database_name > backup.sql

# Restore PostgreSQL database
psql -U username -d database_name < backup.sql
```