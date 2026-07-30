from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'backend/server.js'
text = path.read_text()
old = '"users", "complaints", "job_portal_users", "job_portal_jobs", "job_applications",'
new = '"users", "complaints", "job_portal_users", "job_portal_jobs", "job_portal_applications",'
if old not in text:
    raise RuntimeError('Schema health table list anchor not found')
path.write_text(text.replace(old, new, 1))
print('Schema health table name corrected')
