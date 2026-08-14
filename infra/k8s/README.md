# SnapCal Kubernetes Deployment

## Quick start (managed cluster with kubectl + helm)

```bash
cd infra/k8s/helm/snapcal

# 1. Create namespace and install release
helm upgrade --install snapcal . \
  --namespace snapcal \
  --create-namespace \
  --values values.yaml \
  --set image.tag=main-$(git rev-parse --short HEAD)

# 2. Verify
kubectl get pods -n snapcal
kubectl get ingress -n snapcal
```

## Production overrides

Create `values.prod.yaml` with real secrets (do not commit):

```yaml
env:
  DATABASE_URL: "postgresql://snapcal:xxx@pgbouncer:5432/snapcal?pgbouncer=true&connection_limit=10"
  DATABASE_READ_URL: "postgresql://snapcal:xxx@pgbouncer-read:5432/snapcal?pgbouncer=true&connection_limit=10"
  DATABASE_DIRECT_URL: "postgresql://snapcal:xxx@postgres-primary:5432/snapcal"

secrets:
  JWT_SECRET: "..."
  JWT_REFRESH_SECRET: "..."
  TELEGRAM_BOT_TOKEN: "..."
  OPENROUTER_API_KEY: "..."
  STRIPE_SECRET_KEY: "..."
  STRIPE_WEBHOOK_SECRET: "..."
  AI_AGENT_SECRET: "..."
  ADMIN_SECRET: "..."
  POSTGRES_PASSWORD: "..."

postgres:
  enabled: false  # Use managed PostgreSQL in production

redis:
  enabled: false  # Use managed Redis / Elasticache
```

## Recommended production stack

- **K8s**: managed EKS / GKE / DOKS.
- **PostgreSQL**: AWS RDS/Aurora, Cloud SQL, or DigitalOcean Managed Postgres with pgvector.
- **Redis**: ElastiCache, Cloud Memorystore, or DigitalOcean Managed Redis.
- **Ingress**: nginx-ingress + cert-manager (LetsEncrypt).
- **Registry**: GitHub Container Registry (`ghcr.io/snapcal/snapcal`).
- **Secrets**: external-secrets.io backed by Vault / AWS SM / 1Password.
- **Observability**: Prometheus Operator, Grafana, Jaeger/Tempo, Alertmanager.

## CI/CD integration

1. Build and push Docker image in GitHub Actions.
2. Run `helm upgrade --install` with new tag.
3. Run `prisma migrate deploy` using `DATABASE_DIRECT_URL` in a Kubernetes Job.
4. Wait for rollout status: `kubectl rollout status deployment/snapcal-api -n snapcal`.

## Security notes

- Default `values.yaml` contains placeholder secrets. Never use them in production.
- Disable built-in `postgres` and `redis` in production; use managed services with backups.
- Restrict ingress to CloudFlare or WAF IP ranges if used.
- Enable PodSecurityPolicy / OPA Gatekeeper for non-root containers.
