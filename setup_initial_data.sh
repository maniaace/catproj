#!/bin/bash

echo "Setting up Safaricom Asset Inventory..."

# Start the database
echo "Starting PostgreSQL..."
docker-compose up -d postgres

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run the initialization script
echo "Creating initial data..."
cd backend
python init_data.py

echo ""
echo "Setup complete!"
echo ""
echo "Default login credentials:"
echo "=========================="
echo "Admin User:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Regular User:"
echo "  Username: user1"
echo "  Password: user123"
echo ""
echo "You can now start the full application with:"
echo "  docker-compose up -d"
echo ""
echo "Access the application at: http://localhost:3000"