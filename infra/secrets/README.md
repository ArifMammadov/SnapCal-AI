# SnapCal Secrets Guide

Never commit real `.env` files. Use one of the following secret backends.

## Local development

```bash
cp apps/api/.env.example apps/api/.env
cp apps/ai-agent/.env.example apps/ai-agent/.env
# fill with local dev values
```

## HashiCorp Vault (recommended for production)

```bash
vault kv put secret/snapcal/DATABASE_URL value="postgresql://..."
vault kv put secret/snapcal/JWT_SECRET value="..."
vault kv put secret/snapcal/STRIPE_SECRET_KEY value="..."
```

Env:
```bash
VAULT_ADDR=https://vault.snapcal.health
VAULT_TOKEN=hvs....
VAULT_KV_PATH=secret/snapcal
```

## AWS Secrets Manager

```bash
aws secretsmanager create-secret --name snapcal/production \
  --secret-string '{"DATABASE_URL":"...","JWT_SECRET":"..."}'
```

Env:
```bash
AWS_SECRET_NAME=snapcal/production
AWS_REGION=us-east-1
```

## 1Password Service Account

```bash
op item create --vault Production --category login --title snapcal-production \
  "database_url[password]=postgresql://..." "jwt_secret[password]=..."
```

Env:
```bash
OP_SERVICE_ACCOUNT_TOKEN=ops_...
OP_VAULT=Production
OP_ITEM=snapcal-production
```

## Runtime loading

`packages/shared/src/secrets.ts` resolves secrets at startup. In production it
loads from the configured backend; in dev/test it falls back to process.env.

## Rotation

- Rotate `JWT_SECRET`/`JWT_REFRESH_SECRET` only during planned maintenance; old
  refresh tokens will become invalid.
- Rotate `AGENT_SECRET` and restart API + AI-agent together.
- Rotate `STRIPE_WEBHOOK_SECRET` after each webhook endpoint change.
- Rotate `TELEGRAM_BOT_TOKEN` via @BotFather → Edit bot → Revoke token.

## Audit

All secret access is logged via OpenTelemetry + audit logs. Do not print secrets
in logs; Pino redacts keys containing `token`, `secret`, `password`, `key`.
