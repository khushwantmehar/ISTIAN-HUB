# ISTIAN HUB — Your study command centre

Notes, timetable, assignments, attendance, and reminders — with real student
login, and admin/teacher file uploads for timetables and assignments
(PDF, Word, PowerPoint, Excel, images).

```
istianhub/
├── backend/     Node.js + Express API (auth, files, notes, timetable, assignments, attendance, reminders)
└── frontend/    Static dashboard site that talks to the API
```

## Who can do what

- **Students** — sign up themselves (name, email, password), then log in to
  see the shared timetable and assignments, download any attached files,
  and keep their own private notes, attendance, and reminders.
- **Admin / teacher** — one account, set up by whoever runs the server (not
  self-registerable — see below). Can upload timetable files, add timetable
  slots, post assignments with attached files, and delete any of the above.

## 1. Set up the admin account

Before starting the server for the first time:

```powershell
cd backend
copy .env.example .env
```

Open `.env` in VS Code and fill in:

```
JWT_SECRET=any-long-random-string-you-make-up
ADMIN_NAME=Your Name
ADMIN_EMAIL=teacher@yourschool.com
ADMIN_PASSWORD=choose-a-real-password
```

This account is created automatically the first time the server starts —
there is no "sign up as admin" button anywhere, on purpose, so students
can't grant themselves upload access.

## 2. Run the backend

```powershell
cd backend
npm install
npm start
```

You should see:

```
ISTIAN HUB backend running on http://localhost:4100
Admin account ready: teacher@yourschool.com
```

## 3. Run the frontend

Open a **second terminal**:

```powershell
cd frontend
python -m http.server 5500
```

Open `http://localhost:5500`. Log in with the admin email/password from
your `.env` to upload files, or use "Student sign up" to create a student
account and see the student view.

## Where your data lives

- **Database**: `backend/data/db.json` — accounts, notes, timetable entries,
  assignments, attendance, reminders. Delete it to reset everything (you'll
  need to restart the server afterward so the admin account gets re-seeded).
- **Uploaded files**: `backend/uploads/` — the actual PDF/Word/etc files
  students download. Deleting `db.json` without also clearing this folder
  will leave orphaned files on disk (harmless, just unused).

## Security notes

- Passwords are hashed with bcrypt — never stored in plain text.
- Login sessions are JWTs signed with `JWT_SECRET`. Keep that value secret
  and don't commit `.env` to git.
- Uploaded files are restricted to PDF, Word, PowerPoint, Excel, plain text,
  and common image formats, capped at 20MB — anything else (like `.exe`) is
  rejected automatically.
- Every route that changes shared content (timetable, assignments) checks
  the logged-in user's role server-side — hiding admin buttons in the UI is
  just for convenience; the backend enforces it either way.

## API reference

| Method | Path                              | Who                | Purpose                                |
|--------|------------------------------------|---------------------|------------------------------------------|
| POST   | /api/auth/register                  | Public              | Create a student account                  |
| POST   | /api/auth/login                     | Public              | Log in, get a token                       |
| GET    | /api/auth/me                        | Logged in           | Confirm current session                   |
| GET    | /api/dashboard/summary              | Logged in           | Home overview (personal + shared)         |
| GET    | /api/notes                          | Logged in           | Your own notes                            |
| POST   | /api/notes                          | Logged in           | Add a note                                |
| DELETE | /api/notes/:id                       | Logged in (owner)    | Delete your note                         |
| GET    | /api/timetable                      | Logged in           | Shared weekly schedule                    |
| POST   | /api/timetable                      | Admin               | Add a class slot                          |
| DELETE | /api/timetable/:id                   | Admin               | Remove a class slot                       |
| POST   | /api/timetable/file                  | Admin               | Upload/replace the timetable file         |
| GET    | /api/timetable/file                  | Logged in           | Download the timetable file               |
| DELETE | /api/timetable/file                  | Admin               | Remove the timetable file                 |
| GET    | /api/assignments                    | Logged in           | Shared assignment list + your status      |
| POST   | /api/assignments                    | Admin               | Post an assignment (+ optional file)      |
| GET    | /api/assignments/:id/file             | Logged in           | Download an assignment's file             |
| PATCH  | /api/assignments/:id                 | Logged in           | Mark your own pending/done status         |
| DELETE | /api/assignments/:id                 | Admin               | Delete an assignment                      |
| GET    | /api/attendance                     | Logged in           | Your own tracked subjects                 |
| POST   | /api/attendance                     | Logged in           | Start tracking a subject                  |
| POST   | /api/attendance/:subject/mark        | Logged in           | Log a class present/absent                |
| DELETE | /api/attendance/:subject             | Logged in           | Stop tracking a subject                   |
| GET    | /api/reminders                      | Logged in           | Your own reminders                        |
| POST   | /api/reminders                      | Logged in           | Add a reminder                            |
| DELETE | /api/reminders/:id                   | Logged in (owner)    | Delete your reminder                     |

## What's still a simplification

- Data is a JSON file, not a real database — fine for one class running it
  themselves, not built for large-scale traffic.
- One admin account only — no "add more teachers" flow yet.
- No password reset flow — if the admin forgets their password, edit
  `.env` and delete their entry from `backend/data/db.json`, then restart
  the server to re-seed it.
