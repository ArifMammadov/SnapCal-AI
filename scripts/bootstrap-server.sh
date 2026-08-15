#!/bin/bash
set -euo pipefail

cd /opt/snapcal-main

JWT_SECRET=***
JWT_REFRESH_SECRET=***
AI_AGENT_SECRET=***
ADMIN_SECRET=***

read -s -p "Enter OpenRouter API key: " OPENROUTER_API_KEY
echo

DB_PASSWORD=***

sed -i "s|POSTGRES_PASSWORD: .*|POSTGRES_PASSWORD: ${DB_PASSWORD}|" /opt/snapcal-main/infra/docker/docker-compose.yml
cd /opt/snapcal-main/infra/docker
docker compose down -v || true
POSTGRES_PASSWORD="***" docker compose up -d postgres redis
sleep 5
docker exec -i docker-postgres-1 psql -U snapcal -d snapcal -c "CREATE EXTENSION IF NOT EXISTS vector;" || true

cat > apps/api/.env << EOL
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://snapcal:***@localhost:5432/snapcal?schema=public&connection_limit=20&pgbouncer=true
DATABASE_READ_URL=postgresql://snapcal:***@localhost:5432/snapcal?schema=public&connection_limit=20&pgbouncer=true
DATABASE_DIRECT_URL=postgresql://snapcal:***@localhost:5432/snapcal?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=***
JWT_REFRESH_SECRET=***
ADMIN_SECRET=***
AI_AGENT_URL=http://localhost:4001
AI_AGENT_SECRET=***
MOBILE_APP_URL=https://snapcal.health
ADMIN_APP_URL=https://snapcal.health
OPENROUTER_API_KEY=***
STRIPE_SECRET_KEY=***
STRIPE_WEBHOOK_SECRET=***
TELEGRAM_BOT_TOKEN=***
EOL

cat > apps/ai-agent/.env << EOL
NODE_ENV=production
PORT=4001
HOST=0.0.0.0
DATABASE_URL=postgresql://snapcal:***@localhost:5432/snapcal?schema=public&connection_limit=20&pgbouncer=true
DATABASE_READ_URL=postgresql://snapcal:***@localhost:5432/snapcal?schema=public&connection_limit=20&pgbouncer=true
REDIS_URL=redis://localhost:6379
AGENT_SECRET=***
OPENROUTER_API_KEY=***
EOL

cat > apps/telegram-bot/.env << EOL
NODE_ENV=production
TELEGRAM_BOT_TOKEN=***
DATABASE_URL=postgresql://snapcal:***@localhost:5432/snapcal?schema=public&pgbouncer=true
REDIS_URL=redis://localhost:6379
EOL

cat > apps/mobile/.env << EOL
VITE_API_URL=https://snapcal.health/api
VITE_AI_AGENT_URL=https://snapcal.health/ai
EOL

cat > apps/admin/.env << EOL
VITE_API_URL=https://snapcal.health/api
EOL

cat > packages/database/.env << EOL
DATABASE_URL=postgresql://snapcal:***@localhost:5432/snapcal?schema=public
EOL

cd /opt/snapcal-main
pnpm install
pnpm run build

cd /opt/snapcal-main/packages/database
npx prisma migrate deploy

cat > /etc/nginx/sites-available/snapcal << 'NGINX'
server {
    listen 80;
    server_name snapcal.health test.snapcal.health preprod.snapcal.health;

    location / {
        root /opt/snapcal-main/apps/mobile/dist;
        try_files $uri $uri/ /index.html;
    }

    location /admin {
        alias /opt/snapcal-main/apps/admin/dist;
        try_files $uri $uri/ /admin/index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/snapcal /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

cp /opt/snapcal-main/infra/systemd/snapcal-api-main.service /etc/systemd/system/
cp /opt/snapcal-main/infra/systemd/snapcal-ai-main.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable snapcal-api-main snapcal-ai-main
systemctl start snapcal-api-main snapcal-ai-main

sleep 5
echo "=== API health ==="
curl -s http://localhost:4000/health || echo "API not responding"
echo "=== AI health ==="
curl -s http://localhost:4001/health || echo "AI not responding"

echo "Bootstrap complete."
