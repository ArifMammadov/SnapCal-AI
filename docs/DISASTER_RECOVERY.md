# SnapCal AI — Disaster Recovery Runbook

## 1. Goal
Restore SnapCal AI API + database to a working state after data loss, server failure, or bad deployment.

## 2. Contacts / Secrets
- Production server: `165.245.250.193`
- Deploy key: `DO_PROD_SSH_KEY` in GitHub Secrets
- Database URL: in `/opt/snapcal-main/.env`
- Backup bucket: configured via `S3_BUCKET` / `S3_ENDPOINT`

## 3. Backups
Backups run daily via `snapcal-db-backup.timer` → `snapcal-db-backup.service`.
Dump format: `snapcal-main-YYYYMMDD-HHMMSS.sql.gz` in `s3://${S3_BUCKET}/backups/`.
Retention: 7 days by default.

## 4. Restore database (worst case)

```bash
ssh -i ~/.ssh/do_prod root@165.245.250.193
sudo -n bash -lc '
  source /opt/snapcal-main/.env
  cd /tmp
  aws s3 ls s3://${S3_BUCKET}/backups/ --endpoint-url=${S3_ENDPOINT} | tail -n 5
  # pick latest
  LATEST=$(aws s3 ls s3://${S3_BUCKET}/backups/ --endpoint-url=${S3_ENDPOINT} | awk "{print \$4}" | sort | tail -n 1)
  aws s3 cp s3://${S3_BUCKET}/backups/${LATEST} /tmp/latest.sql.gz --endpoint-url=${S3_ENDPOINT}
  dropdb --if-exists snapcal_main || true
  createdb snapcal_main
  gunzip -c /tmp/latest.sql.gz | psql "${DATABASE_URL}"
  cd /opt/snapcal-main/packages/database
  npx prisma migrate deploy
'
```

## 5. Restore application after bad deploy
GitHub Actions deploys main branch. To rollback:

```bash
# Locally, with rights
gh run list --branch=main --workflow=CI/CD
# Identify last good run commit
gh run rerun <run-id>
```

Or via SSH:

```bash
ssh root@165.245.250.193
sudo -n bash -lc '
  cd /opt/snapcal-main
  git fetch origin
  git checkout -f origin/main~1
  pnpm install --frozen-lockfile
  pnpm --filter @snapcal/database build
  pnpm --filter @snapcal/shared build
  pnpm --filter @snapcal/api build
  pnpm --filter @snapcal/ai-agent build
  pnpm --filter @snapcal/telegram-bot build
  pnpm --filter @snapcal/admin build
  pnpm --filter @snapcal/mobile build
  systemctl restart snapcal-api-main snapcal-ai-main snapcal-ai-worker
  systemctl reload nginx
'
```

## 6. Verify after restore
- `curl https://snapcal.health/api/health` → 200 OK
- `curl https://snapcal.health/admin` → admin UI loads
- Check `systemctl status snapcal-api-main snapcal-ai-main snapcal-ai-worker`

## 7. AI service cost emergency
If OpenRouter costs spike:
- Set `AI_GLOBAL_DAILY_COST_CAP_USD=0` in `.env` and restart `snapcal-ai-main` to block AI requests.
- Investigate abuse in admin panel `AI Logs`.

## 8. Incident checklist
- [ ] Identify scope: API, DB, AI, Telegram bot, admin
- [ ] Check server status and logs
- [ ] If data issue: restore from latest backup
- [ ] If deploy issue: rollback via GitHub Actions or git
- [ ] Verify health endpoints
- [ ] Notify users via Telegram bot if prolonged outage
