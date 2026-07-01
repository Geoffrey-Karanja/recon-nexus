#!/bin/bash
echo "Starting RECON NEXUS..."

# Start services
sudo service postgresql start
sudo service redis-server start

# Start API (serves frontend too)
cd /home/benjamin/recon-nexus/apps/api
pnpm dev &
API_PID=$!

sleep 3

# Start ngrok tunnel
ngrok http 3001 &
NGROK_PID=$!

echo ""
echo "✅ RECON NEXUS is running!"
echo "🌐 URL: https://railcar-junction-dreamlike.ngrok-free.dev"
echo ""
echo "Press Ctrl+C to stop everything"

trap "kill $API_PID $NGROK_PID; sudo service postgresql stop; sudo service redis-server stop" EXIT
wait
