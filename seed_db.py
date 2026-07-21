import sqlite3
import hashlib
import uuid
import datetime
import os

email = "admin@aura-soc.local"
password = "AuraSecureAdmin@2026"
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
    
    # Purge the exposed personal email record to prevent exposure in local installations
    conn.execute("DELETE FROM users WHERE email = 'jaiakash2403@gmail.com'")
    conn.commit()
    
    # Check if new admin exists
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
    print("Database seeding and exposed credential purge completed successfully.")
