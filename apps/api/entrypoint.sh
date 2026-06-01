#!/bin/sh
set -e

echo "==> Syncing database schema..."
# db push without --accept-data-loss: will refuse destructive changes (safe for production)
# Switch to 'migrate deploy' once formal migrations are generated.
npx prisma db push \
  --schema=packages/database/prisma/schema.prisma \
  --skip-generate \
  || {
    echo "WARNING: db push failed — continuing startup (schema may already be current)"
  }

echo "==> Starting API server..."
exec node apps/api/dist/main
