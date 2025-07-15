#!/usr/bin/env python3

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection details
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "asset_inventory")
DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password123")

def fix_team_constraints():
    """Fix team name constraints to allow same names under different parents"""
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
        
        print("Fixing team name constraints...")
        
        # Drop the existing unique constraint on name
        try:
            cursor.execute("DROP INDEX IF EXISTS ix_teams_name;")
            print("✓ Dropped old unique constraint on team name")
        except Exception as e:
            print(f"✗ Error dropping constraint: {e}")
        
        # Create a new unique constraint on (name, COALESCE(parent_team_id, 0))
        # This allows teams with the same name under different parents
        # Main teams (parent_team_id = NULL) will be grouped with parent_team_id = 0
        try:
            cursor.execute("""
                CREATE UNIQUE INDEX ix_teams_name_parent 
                ON teams (name, COALESCE(parent_team_id, 0));
            """)
            print("✓ Created new unique constraint on (name, parent_team_id)")
        except Exception as e:
            print(f"✗ Error creating new constraint: {e}")
        
        # Commit changes
        conn.commit()
        print("✓ Team constraint fix completed successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"✗ Fix failed: {e}")

if __name__ == "__main__":
    fix_team_constraints()