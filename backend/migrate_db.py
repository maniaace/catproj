#!/usr/bin/env python3

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection details
DB_HOST = os.getenv("DB_HOST", "postgres")  # Use postgres container name
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "asset_inventory")
DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password123")

def migrate_database():
    """Add missing columns to existing database tables"""
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        cursor = conn.cursor()
        
        print("Starting database migration...")
        
        # Add columns to teams table if they don't exist
        teams_migrations = [
            "ALTER TABLE teams ADD COLUMN IF NOT EXISTS parent_team_id INTEGER REFERENCES teams(id);",
            "ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_type VARCHAR(20) DEFAULT 'main' NOT NULL;"
        ]
        
        # Add columns to assets table if they don't exist
        assets_migrations = [
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'dev' NOT NULL;",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS criticality VARCHAR(20) DEFAULT 'medium' NOT NULL;",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS business_impact VARCHAR(50);",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_type VARCHAR(50);",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS location VARCHAR(100);",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS compliance_requirements TEXT;"
        ]
        
        # Execute teams migrations
        print("Migrating teams table...")
        for migration in teams_migrations:
            try:
                cursor.execute(migration)
                print(f"✓ {migration}")
            except Exception as e:
                print(f"✗ {migration} - {e}")
        
        # Execute assets migrations
        print("Migrating assets table...")
        for migration in assets_migrations:
            try:
                cursor.execute(migration)
                print(f"✓ {migration}")
            except Exception as e:
                print(f"✗ {migration} - {e}")
        
        # Commit changes
        conn.commit()
        print("✓ Database migration completed successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")

if __name__ == "__main__":
    migrate_database()