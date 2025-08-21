#!/bin/bash

echo "Starting Web Terminator..."
echo "Server will be available at: http://localhost:3002"
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the server
echo "Starting server on port 3002..."
node server.js
