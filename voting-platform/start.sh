#!/bin/bash

# Voting Platform Startup Script

echo "🚀 Starting Voting Platform..."
echo ""

# Check if node_modules exist
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Start backend server
echo "🔧 Starting backend server on port 5000..."
cd server && npm start &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Start frontend client
echo "🎨 Starting frontend client on port 3000..."
cd ../client && npm start &
CLIENT_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo "📍 Backend: http://localhost:5000"
echo "📍 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $SERVER_PID $CLIENT_PID
