#!/usr/bin/env bash
set -euo pipefail

export JWT_SECRET="${JWT_SECRET:-local-video-manager-jwt-secret-change-me}"
export DB_HOST="${DB_HOST:-192.168.1.20}"
export DB_PORT="${DB_PORT:-3306}"
export DB_NAME="${DB_NAME:-video_manager}"
export DB_USERNAME="${DB_USERNAME:-root}"
export FLYWAY_ENABLED="${FLYWAY_ENABLED:-true}"
export NACOS_DISCOVERY_ENABLED="${NACOS_DISCOVERY_ENABLED:-false}"

mvn package -DskipTests

java -jar auth-service/target/auth-service-1.0.0-SNAPSHOT.jar &
auth_pid=$!
java -jar media-service/target/media-service-1.0.0-SNAPSHOT.jar &
media_pid=$!
java -jar reading-service/target/reading-service-1.0.0-SNAPSHOT.jar &
reading_pid=$!
java -jar gateway-service/target/gateway-service-1.0.0-SNAPSHOT.jar &
gateway_pid=$!
java -jar office-service/target/office-service-1.0.0-SNAPSHOT.jar &
office_pid=$!

shutdown() {
  kill "$gateway_pid" "$office_pid" "$reading_pid" "$media_pid" "$auth_pid" 2>/dev/null || true
}
trap shutdown EXIT INT TERM

echo "Gateway: http://127.0.0.1:4000"
echo "Auth:    http://127.0.0.1:4010"
echo "Media:   http://127.0.0.1:4020"
echo "Reading: http://127.0.0.1:4030"
echo "Office:  http://127.0.0.1:4040"
wait
