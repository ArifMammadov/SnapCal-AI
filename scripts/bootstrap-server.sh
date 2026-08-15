# Server bootstrap for SnapCal AI
# Run as root on the droplet 64.226.122.183

set -e

echo "=== Updating packages ==="
apt update
apt upgrade -y

echo "=== Installing dependencies ==="
apt install -y redis-server postgresql postgresql-contrib curl git

echo "=== Starting Redis ==="
systemctl enable redis-server
systemctl start redis-server
redis-cli ping

echo "=== Starting PostgreSQL ==="
systemctl enable postgresql
systemctl start postgresql

echo "=== Creating database and user ==="
sudo -u postgres psql << 'PSQL'
DROP DATABASE IF EXISTS snapcal_main;
DROP USER IF EXISTS snapcal;
CREATE USER snapcal WITH ENCRYPTED PASSWORD 'SnapCal_DB_Pass_2026!';
CREATE DATABASE snapcal_main OWNER snapcal;
GRANT ALL PRIVILEGES ON DATABASE snapcal_main TO snapcal;
\c snapcal_main
GRANT ALL ON SCHEMA public TO snapcal;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO snapcal;
PSQL

echo "=== Ensuring app directory exists ==="
mkdir -p /opt/snapcal-main

echo "=== Writing .env ==="
cat > /opt/snapcal-main/.env << 'ENV'
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://snapcal:SnapCal_DB_Pass_2026!@localhost:5432/snapcal_main
DATABASE_READ_URL=postgresql://snapcal:SnapCal_DB_Pass_2026!@localhost:5432/snapcal_main
REDIS_URL=redis://localhost:6379
JWT_SECRET=SnapCal_JWT_Secret_Change_Me_2026_Long_String
JWT_REFRESH_SECRET=SnapCal_JWT_Refresh_Secret_Change_Me_2026_Long_String
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
ADMIN_SECRET=SnapCal_Admin_Secret_Change_Me_2026
AI_AGENT_SECRET=SnapCal_AI_Agent_Secret_Change_Me_2026
AGENT_SECRET=SnapCal_AI_Agent_Secret_Change_Me_2026
MOBILE_APP_URL=https://snapcal.health
ADMIN_APP_URL=https://snapcal.health/admin
AI_AGENT_URL=http://localhost:4001
API_SERVICE_URL=http://localhost:4000
ENV

chmod 600 /opt/snapcal-main/.env

echo "=== Copying .env to preprod/test ==="
cp /opt/snapcal-main/.env /opt/snapcal-preprod/.env
cp /opt/snapcal-main/.env /opt/snapcal-test/.env

echo "=== Running Prisma migrations ==="
cd /opt/snapcal-main/packages/database
DATABASE_URL="postgresql://snapcal:SnapCal_DB_Pass_2026!@localhost:5432/snapcal_main" npx prisma migrate deploy

echo "=== Copying new systemd units ==="
cp /opt/snapcal-main/infra/systemd/snapcal-api-main.service /etc/systemd/system/
cp /opt/snapcal-main/infra/systemd/snapcal-ai-main.service /etc/systemd/system/
cp /opt/snapcal-main/infra/systemd/snapcal-api-preprod.service /etc/systemd/system/
cp /opt/snapcal-main/infra/systemd/snapcal-ai-preprod.service /etc/systemd/system/
cp /opt/snapcal-main/infra/systemd/snapcal-api-test.service /etc/systemd/system/
cp /opt/snapcal-main/infra/systemd/snapcal-ai-test.service /etc/systemd/system/

echo "=== Reloading systemd and restarting services ==="
systemctl daemon-reload
systemctl restart snapcal-api-main snapcal-ai-main
systemctl enable snapcal-api-main snapcal-ai-main

echo "=== Waiting for services ==="
sleep 10

echo "=== Health checks ==="
curl -s -o /dev/null -w 'API health: %{http_code}\n' http://localhost:4000/health
curl -s -o /dev/null -w 'AI health: %{http_code}\n' http://localhost:4001/health

echo "=== Done ==="
