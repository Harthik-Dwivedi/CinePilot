#!/bin/bash

echo "Starting CinePilot..."
echo
echo "Make sure you have:"
echo "1. Installed Node.js and npm"
echo "2. Set up the MySQL database"
echo "3. Created a .env file with your configuration"
echo
echo "Press Enter to install dependencies and start the application..."
read

npm install
echo
echo "Dependencies installed successfully!"
echo
echo "Starting the application..."
npm start 