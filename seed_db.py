import sqlite3
import hashlib
import uuid
import datetime
import os

email = "jaiakash2403@gmail.com"
password = "@123Abc7"
role = "admin"

def seed_db(db_path):
    print(f"Seeding database at: {db_path}")
    
    # Ensure directory exists
    dir_name = os.path.dirname(db_path)
    if dir_name and not os.path.exists(dir_name):
        os.makedirs(dir_name)
        
    conn = sqlite3.connect(db_path)
    # Ensure table exists
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password_hash TEXT,
            salt TEXT,
            role TEXT DEFAULT 'user',
            registered_at TEXT,
            last_score INTEGER DEFAULT NULL,
            last_scan_time TEXT DEFAULT NULL
        )
    """)
    conn.commit()
    
    # Check if user exists
    cursor = conn.execute("SELECT id FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    salt = uuid.uuid4().hex
    hashed = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    registered_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if user:
        conn.execute("""
            UPDATE users 
            SET password_hash = ?, salt = ?, role = ?
            WHERE email = ?
        """, (hashed, salt, role, email))
        print(f"User {email} already existed. Updated password and set role to {role}.")
    else:
        conn.execute("""
            INSERT INTO users (email, password_hash, salt, role, registered_at)
            VALUES (?, ?, ?, ?, ?)
        """, (email, hashed, salt, role, registered_at))
        print(f"Successfully seeded new admin user: {email} with role: {role}.")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    # Seed local dev database
    seed_db("soc_dashboard.db")
    
    # Seed packaged exe database
    seed_db("dist/soc_dashboard.db")
    print("Database seeding completed successfully.")
