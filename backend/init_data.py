import asyncio
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, Team
from auth import get_password_hash

def create_initial_data():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("Admin user already exists")
            return
        
        # Create default team
        default_team = Team(
            name="IT Security Team",
            description="Default team for system administrators"
        )
        db.add(default_team)
        db.commit()
        db.refresh(default_team)
        
        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@safaricom.co.ke",
            hashed_password=get_password_hash("admin123"),
            full_name="System Administrator",
            is_active=True,
            is_admin=True,
            team_id=default_team.id
        )
        db.add(admin_user)
        
        # Create sample team
        sample_team = Team(
            name="Network Operations",
            description="Network operations and monitoring team"
        )
        db.add(sample_team)
        
        # Create sample user
        sample_user = User(
            username="user1",
            email="user1@safaricom.co.ke",
            hashed_password=get_password_hash("user123"),
            full_name="John Doe",
            is_active=True,
            is_admin=False,
            team_id=sample_team.id
        )
        db.add(sample_user)
        
        db.commit()
        
        print("Initial data created successfully!")
        print("Admin credentials: admin / admin123")
        print("User credentials: user1 / user123")
        
    except Exception as e:
        print(f"Error creating initial data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_initial_data()