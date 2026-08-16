#!/bin/bash
# Full server bootstrap for SnapCal AI
# Run as root on a fresh Ubuntu 24.04 droplet
# Usage: bash /root/bootstrap.sh

set -euo pipefail

APP_DIR=/opt/snapcal-main
REPO_URL=https://github.com/ArifMammadov/SnapCal-AI.git
DOMAIN_MAIN=snapcal.health
DOMAIN_PREPROD=preprod.snapcal.health
DOMAIN_TEST=test.snapcal.health

DB_PASS='SnapCal_DB_Pass_2026'
JWT_SECRET='SnapCal_JWT_Secret_Change_Me_2026_Long_String_Min_32'
JWT_REFRESH_SECRET='SnapCal_JWT_Refresh_Secret_Change_Me_2026_Long_String_Min_32'
ADMIN_SECRET='SnapCal_Admin_Secret_Change_Me_2026'
AI_AGENT_SECRET='SnapCal_AI_Agent_Secret_Change_Me_2026'
AGENT_SECRET='SnapCal_AI_Agent_Secret_Change_Me_2026'

echo "=== Step 1/12: Update packages ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

echo "=== Step 2/12: Install dependencies ==="
apt-get install -y \
  curl \
  git \
  nginx \
  redis-server \
  postgresql \
  postgresql-contrib \
  postgresql-16-pgvector \
  ufw \
  certbot \
  python3-certbot-nginx \
  build-essential

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# pnpm 9.15.0
npm install -g pnpm@9.15.0

echo "=== Step 3/12: Configure Redis (localhost only) ==="
sed -i 's/^# *bind 127.0.0.1 ::1/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
sed -i 's/^bind 0.0.0.0/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
sed -i 's/^protected-mode no/protected-mode yes/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server
redis-cli ping

echo "=== Step 4/12: Configure PostgreSQL ==="
systemctl enable postgresql
systemctl restart postgresql

sudo -u postgres psql <<PSQL
DROP DATABASE IF EXISTS snapcal_main;
DROP DATABASE IF EXISTS snapcal_preprod;
DROP DATABASE IF EXISTS snapcal_test;
DROP USER IF EXISTS snapcal;
CREATE USER snapcal WITH ENCRYPTED PASSWORD '${DB_PASS}';
CREATE DATABASE snapcal_main OWNER snapcal;
CREATE DATABASE snapcal_preprod OWNER snapcal;
CREATE DATABASE snapcal_test OWNER snapcal;
PSQL

for db in snapcal_main snapcal_preprod snapcal_test; do
  sudo -u postgres psql -d "$db" <<PSQL
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT ALL ON SCHEMA public TO snapcal;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO snapcal;
PSQL
done

echo "=== Step 5/12: Create application directories ==="
mkdir -p /opt/snapcal-main /opt/snapcal-preprod /opt/snapcal-test

echo "=== Step 6/12: Generate .env files ==="
cat > /opt/snapcal-main/.env <<ENV
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://snapcal:${DB_PASS}@localhost:5432/snapcal_main
DATABASE_READ_URL=postgresql://snapcal:${DB_PASS}@localhost:5432/snapcal_main
REDIS_URL=redis://localhost:6379
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
ADMIN_SECRET=${ADMIN_SECRET}
AI_AGENT_SECRET=${AI_AGENT_SECRET}
AGENT_SECRET=${AGENT_SECRET}
MOBILE_APP_URL=https://${DOMAIN_MAIN}
ADMIN_APP_URL=https://${DOMAIN_MAIN}/admin
AI_AGENT_URL=http://localhost:4001
API_SERVICE_URL=http://localhost:4000
ENV

cat > /opt/snapcal-preprod/.env <<ENV
NODE_ENV=production
PORT=4002
HOST=0.0.0.0
DATABASE_URL=postgresql://snapcal:${DB_PASS}@localhost:5432/snapcal_preprod
DATABASE_READ_URL=postgresql://snapcal:${DB_PASS}@localhost:5432/snapcal_preprod
REDIS_URL=redis://localhost:6379
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
ADMIN_SECRET=${ADMIN_SECRET}
AI_AGENT_SECRET=${AI_AGENT_SECRET}
AGENT_SECRET=${AGENT_SECRET}
MOBILE_APP_URL=https://${DOMAIN_PREPROD}
ADMIN_APP_URL=https://${DOMAIN_PREPROD}/admin
AI_AGENT_URL=http://localhost:4003
API_SERVICE_URL=http://localhost:4002
ENV

cat > /opt/snapcal-test/.env <<ENV
NODE_ENV=production
PORT=4004
HOST=0.0.0.0
DATABASE_URL=postgresql://snapcal:${DB_PASS}@localhost:5432/snapcal_test
DATABASE_READ_URL=postgresql://snapcal:${DB_PASS}@localhost:5432/snapcal_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
ADMIN_SECRET=${ADMIN_SECRET}
AI_AGENT_SECRET=${AI_AGENT_SECRET}
AGENT_SECRET=${AGENT_SECRET}
MOBILE_APP_URL=https://${DOMAIN_TEST}
ADMIN_APP_URL=https://${DOMAIN_TEST}/admin
AI_AGENT_URL=http://localhost:4005
API_SERVICE_URL=http://localhost:4004
ENV

chmod 600 /opt/snapcal-main/.env /opt/snapcal-preprod/.env /opt/snapcal-test/.env

echo "=== Step 7/12: Clone repository ==="
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone "${REPO_URL}" "${APP_DIR}"
else
  cd "${APP_DIR}" && git pull
fi

echo "=== Step 8/12: Install dependencies and build ==="
cd "${APP_DIR}"
pnpm install
pnpm run build

echo "=== Step 9/12: Apply database migrations ==="
cd "${APP_DIR}/packages/database"
DATABASE_URL="postgresql://snapcal:${DB_PASS}@localhost:5432/snapcal_main" npx prisma migrate deploy
DATABASE_URL="postgresql://snapcal:${DB_PASS}@localhost:5432/snapcal_preprod" npx prisma migrate deploy
DATABASE_URL="postgresql://snapcal:${DB_PASS}@localhost:5432/snapcal_test" npx prisma migrate deploy

echo "=== Step 10/12: Configure firewall ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 4000:4005/tcp
ufw deny 6379/tcp
ufw --force enable

echo "=== Step 11/12: Install systemd units ==="
cp "${APP_DIR}/infra/systemd/"*.service /etc/systemd/system/

# Pre-create working directories for preprod/test
mkdir -p /opt/snapcal-preprod/infra /opt/snapcal-test/infra

systemctl daemon-reload
systemctl enable snapcal-api-main snapcal-ai-main snapcal-api-preprod snapcal-ai-preprod snapcal-api-test snapcal-ai-test
systemctl restart snapcal-api-main snapcal-ai-main snapcal-api-preprod snapcal-ai-preprod snapcal-api-test snapcal-ai-test

echo "=== Step 12/12: Health checks ==="
sleep 10
curl -s -o /dev/null -w 'API main health: %{http_code}\n' http://localhost:4000/health
curl -s -o /dev/null -w 'AI main health: %{http_code}\n' http://localhost:4001/health
curl -s -o /dev/null -w 'API preprod health: %{http_code}\n' http://localhost:4002/health
curl -s -o /dev/null -w 'AI preprod health: %{http_code}\n' http://localhost:4003/health
curl -s -o /dev/null -w 'API test health: %{http_code}\n' http://localhost:4004/health
curl -s -o /dev/null -w 'AI test health: %{http_code}\n' http://localhost:4005/health

echo ""
echo "=== Bootstrap complete ==="
echo "Next steps:"
echo "1. Update DNS A-records: ${DOMAIN_MAIN}, ${DOMAIN_PREPROD}, ${DOMAIN_TEST} -> $(curl -s ifconfig.me)"
echo "2. Run: certbot --nginx -d ${DOMAIN_MAIN} -d ${DOMAIN_PREPROD} -d ${DOMAIN_TEST}"
echo "3. Edit /opt/snapcal-main/.env, /opt/snapcal-preprod/.env, /opt/snapcal-test/.env"
echo "   Replace TELEGRAM_BOT_TOKEN and OPENROUTER_API_KEY with real values"
echo "4. Restart services: systemctl restart snapcal-api-* snapcal-ai-*"
