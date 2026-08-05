#!/bin/bash
set -e

COMPOSE_FILE=docker-compose.prod.yml
DOMAIN=snapcal.health
ADMIN_DOMAIN=admin.snapcal.health
BLUE=api-blue
GREEN=api-green
CURRENT=$(docker-compose -f $COMPOSE_FILE ps -q $BLUE | wc -l)

if [ "$CURRENT" -eq "0" ]; then
  NEW=$BLUE
  OLD=$GREEN
else
  NEW=$GREEN
  OLD=$BLUE
fi

echo "Deploying new version to $NEW..."

export IMAGE_TAG=${IMAGE_TAG:-latest}

# Pull images
docker-compose -f $COMPOSE_FILE pull

# Start new containers without nginx dependency
docker-compose -f $COMPOSE_FILE up -d --no-deps --scale $NEW=2 --scale $OLD=2 $NEW ai-agent-$NEW telegram-bot mobile admin postgres redis

# Health check new API
for i in {1..12}; do
  if docker-compose -f $COMPOSE_FILE exec -T $NEW wget --quiet --tries=1 --spider http://localhost:4000/health; then
    echo "$NEW is healthy"
    break
  fi
  echo "Waiting for $NEW... ($i)"
  sleep 5
done

# Switch nginx upstream to new
docker-compose -f $COMPOSE_FILE up -d --no-deps nginx

# Stop old containers
docker-compose -f $COMPOSE_FILE up -d --no-deps --scale $OLD=0 $OLD ai-agent-$OLD

echo "Deployment complete. Active: $NEW"
