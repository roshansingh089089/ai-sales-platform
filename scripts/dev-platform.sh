#!/usr/bin/env bash
set -euo pipefail

docker compose -f docker/docker-compose.platform.yml up -d
