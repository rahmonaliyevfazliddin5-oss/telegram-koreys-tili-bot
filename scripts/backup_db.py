import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def backup_database(output_path: str = None):
    if not output_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        os.makedirs("backups", exist_ok=True)
        output_path = f"backups/db_backup_{timestamp}.json"
    
    db_url = settings.DATABASE_URL
    print(f"Connecting to {db_url} for backup...")
    try:
        engine = create_async_engine(db_url)
        tables = [
            "students", "attendance_sessions", "attendance_marks", 
            "grades", "ledger", "sources", "users", "lessons", 
            "exams", "exam_grades", "admin_code"
        ]
        backup_data = {}
        async with engine.connect() as conn:
            for tbl in tables:
                try:
                    res = await conn.execute(text(f"SELECT * FROM {tbl}"))
                    rows = [dict(r._mapping) for r in res.fetchall()]
                    # Serialize dates and datetimes
                    for r in rows:
                        for k, v in r.items():
                            if hasattr(v, "isoformat"):
                                r[k] = v.isoformat()
                    backup_data[tbl] = rows
                except Exception as e:
                    backup_data[tbl] = f"Error or table not found: {str(e)}"
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2)
        print(f"Backup saved successfully to {output_path}")
        await engine.dispose()
    except Exception as e:
        print(f"Direct connection failed (e.g. Docker host resolution): {e}")
        print("Note: In production docker, run `docker exec course_bot_postgres pg_dump -U postgres course_bot_db > backup.sql`")

if __name__ == "__main__":
    asyncio.run(backup_database())
