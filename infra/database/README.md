# SnapCal Database Scaling Guide

## Connection strings

Production uses two roles:

- `DATABASE_URL` — read/write primary, used for all mutations and migrations.
- `DATABASE_READ_URL` — read replica (or PgBouncer pool) for SELECT queries.
- `DATABASE_DIRECT_URL` — direct PostgreSQL URL for Prisma migrations when
  `DATABASE_URL` points through PgBouncer.

## PgBouncer

Use transaction-pooling mode with `pgbouncer=true` query parameter:

```text
postgresql://snapcal:pass@pgbouncer:5432/snapcal?pgbouncer=true&connection_limit=10
```

For migrations use the direct URL because Prisma Migrate needs prepared statements:

```text
postgresql://snapcal:pass@postgres:5432/snapcal
```

## Read replicas

Set `DATABASE_READ_URL` to replica or to PgBouncer read pool. The application
exports `prismaRead` from `@snapcal/database` for read-only queries. If
`DATABASE_READ_URL` is unset, `prismaRead` falls back to `DATABASE_URL`.

## Recommended connection limits

| Service | Pool size | Notes |
|---------|-----------|-------|
| PgBouncer | 100 max, 20 reserve | Default pool_size per user/db |
| API containers | `connection_limit=10` | Prisma internal pool |
| AI agent | `connection_limit=5` | Mostly reads + writes |
| Worker | `connection_limit=5` | Batch writes |

## Local development

```bash
# apps/api/.env
DATABASE_URL=postgresql://snapcal:snapcal@localhost:5432/snapcal?connection_limit=10
DATABASE_READ_URL=postgresql://snapcal:snapcal@localhost:5432/snapcal?connection_limit=10
```
