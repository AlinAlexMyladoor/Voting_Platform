#!/usr/bin/env fish

# Voting Platform Startup Script for Fish Shell

echo "🚀 Starting Voting Platform..."
echo ""

# Check if node_modules exist
if not test -d "server/node_modules"
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
end

if not test -d "client/node_modules"
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
end

# Start backend server
echo "🔧 Starting backend server on port 5000..."
cd server && npm start &
set SERVER_PID $last_pid

# Wait for server to start
sleep 3

# Start frontend client
echo "🎨 Starting frontend client on port 3000..."
cd ../client && npm start &
set CLIENT_PID $last_pid

echo ""
echo "✅ Both servers are starting..."
echo "📍 Backend: http://localhost:5000"
echo "📍 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Keep script running
while true
    sleep 1
end
