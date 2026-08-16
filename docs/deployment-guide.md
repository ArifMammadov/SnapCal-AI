# SnapCal AI — Deployment Guide for New Server

## Goal
Deploy SnapCal AI to a fresh Ubuntu 24.04 droplet in 1–2 hours with production, preprod and test environments.

## Prerequisites
- Domain names: `snapcal.health`, `preprod.snapcal.health`, `test.snapcal.health`
- DNS A-records pointing to the new droplet IP
- GitHub repository `ArifMammadov/SnapCal-AI` with updated `main` branch
- GitHub Actions secrets:
  - `PROD_HOST` — new droplet IP
  - `PROD_USER` — `root`
  - `DO_PROD_SSH_KEY` — private SSH key for CI/CD (generated below)

---

## Step 1. Create Droplet

1. In DigitalOcean create Ubuntu 24.04 droplet.
2. Choose SSH key or password. For this guide use password and reset it via console.
3. Copy the public IPv4 address.

---

## Step 2. Update DNS

Point all three domains to the droplet IP:

```
snapcal.health        A  <DROPLET_IP>
preprod.snapcal.health A  <DROPLET_IP>
test.snapcal.health    A  <DROPLET_IP>
```

Wait 5–15 minutes for DNS propagation.

---

## Step 3. Open DigitalOcean Console

1. In DigitalOcean click **Console** for the droplet.
2. Login as `root` with the password.
3. If asked to change password — change it.

---

## Step 4. Download and run bootstrap script

Inside the console run:

```bash
curl -fsSL https://raw.githubusercontent.com/ArifMammadov/SnapCal-AI/main/scripts/bootstrap-server.sh -o /root/bootstrap.sh
chmod +x /root/bootstrap.sh
bash /root/bootstrap.sh
```

The script will:
- Update system
- Install Node.js 22, pnpm 9.15.0, PostgreSQL, Redis, nginx, certbot
- Configure Redis to listen only on localhost
- Create 3 databases: `snapcal_main`, `snapcal_preprod`, `snapcal_test`
- Create user `snapcal` with password `SnapCal_DB_Pass_2026`
- Enable `vector` and `pgcrypto` extensions
- Create `/opt/snapcal-main`, `/opt/snapcal-preprod`, `/opt/snapcal-test`
- Generate `.env` files for all 3 environments
- Clone the repository
- Install dependencies and build all apps
- Apply Prisma migrations
- Configure UFW firewall
- Install systemd units and start all 6 services
- Run health checks

This takes 20–40 minutes.

---

## Step 5. Generate SSH key for GitHub Actions

After bootstrap finishes, still in console:

```bash
ssh-keygen -t ed25519 -f /root/.ssh/snapcal-ci -N ""
cat /root/.ssh/snapcal-ci.pub >> /root/.ssh/authorized_keys
cat /root/.ssh/snapcal-ci
```

Copy the entire private key output (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`).

---

## Step 6. Add GitHub Secrets

1. Open https://github.com/ArifMammadov/SnapCal-AI/settings/secrets/actions
2. Add / update:

| Name | Value |
|---|---|
| `PROD_HOST` | your droplet IP |
| `PROD_USER` | `root` |
| `DO_PROD_SSH_KEY` | full private key from Step 5 |

---

## Step 7. Configure Nginx and SSL

In the droplet console:

```bash
cp /opt/snapcal-main/infra/nginx/*.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/snapcal.health.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/preprod.snapcal.health.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/test.snapcal.health.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

Then get SSL certificates:

```bash
certbot --nginx -d snapcal.health -d preprod.snapcal.health -d test.snapcal.health
```

Choose:
- Redirect HTTP to HTTPS: **Yes**

---

## Step 8. Replace placeholder secrets in .env

Edit the three `.env` files:

```bash
nano /opt/snapcal-main/.env
nano /opt/snapcal-preprod/.env
nano /opt/snapcal-test/.env
```

Replace:
- `TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here` → real token from @BotFather
- `OPENROUTER_API_KEY=your_openrouter_api_key_here` → real key

Save and restart:

```bash
systemctl restart snapcal-api-main snapcal-ai-main snapcal-api-preprod snapcal-ai-preprod snapcal-api-test snapcal-ai-test
```

---

## Step 9. Verify

```bash
curl -s -X POST https://snapcal.health/api/auth/demo
curl -s -X POST https://preprod.snapcal.health/api/auth/demo
curl -s -X POST https://test.snapcal.health/api/auth/demo
```

All should return JSON with token.

---

## Step 10. CI/CD test

1. Make a small change in repository.
2. Push to `main`.
3. Open https://github.com/ArifMammadov/SnapCal-AI/actions
4. Confirm `CI/CD` workflow is green.
5. Check https://snapcal.health in browser — demo login should work.

---

## Security notes

- Redis listens only on `127.0.0.1 ::1`
- UFW blocks port 6379 from outside
- `.env` files have `chmod 600`
- No secrets are stored in GitHub except SSH key and host
- SSL via certbot

---

## Troubleshooting

### API does not start
```bash
journalctl -u snapcal-api-main -n 40 --no-pager
```

### AI Agent does not start
```bash
journalctl -u snapcal-ai-main -n 40 --no-pager
```

### Cannot connect to database
```bash
sudo -u postgres psql -c "\du"
sudo -u postgres psql -d snapcal_main -c "\dt"
```

### Nginx error
```bash
nginx -t
systemctl status nginx
```

---

## Files changed in repository

- `scripts/bootstrap-server.sh` — full server setup
- `.github/workflows/ci-cd.yml` — deploys 3 branches, copies systemd units, health-checks API + AI
- `infra/systemd/*.service` — 6 services for main/preprod/test
- `infra/nginx/*.conf` — nginx configs for 3 domains
- `apps/api/src/lib/env.ts` — `TELEGRAM_BOT_TOKEN` optional with placeholder default
- `apps/telegram-bot/src/lib/env.ts` — `TELEGRAM_BOT_TOKEN` optional with placeholder default
