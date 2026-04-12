# ⭐ Dhruv Star Academy — Attendance & WhatsApp Notification System

A web-based attendance management system for **Dhruv Star Academy** tuition center. Teachers mark attendance, and parents receive automatic WhatsApp notifications about their child's presence.

---

## Features

- **Teacher Login** — Teachers log in and mark attendance for their class
- **Admin Dashboard** — Add/edit/delete students and teachers, view attendance history
- **Smart Class/Board Selection** — Classes 1-7 (no board), Classes 8-10 (State/CBSE/ICSE)
- **WhatsApp Notifications** — Automatic messages sent to parents via Twilio API
- **Secure** — JWT authentication, bcrypt password hashing, rate limiting

---

## Pages

| Page | URL | Access |
|------|-----|--------|
| Login | `/` | Teachers + Admin link |
| Attendance | `/attendance` | Teachers (after login) |
| Admin Dashboard | `/admin` | Admin only |

---

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)
- **Auth:** JWT + bcrypt
- **WhatsApp:** Twilio API
- **Frontend:** Vanilla HTML/CSS/JS (no framework needed)

---

## Setup (Local Development)

### 1. Clone & Install

```bash
git clone https://github.com/Ynshruthie/Dhruv-Star-Academy.git
cd Dhruv-Star-Academy
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `JWT_SECRET` — Change to a random string (e.g. `openssl rand -hex 32`)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — Your admin login credentials
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER` — From Twilio console

### 3. Start the Server

```bash
npm start
```

Open `http://localhost:3000` in your browser.

### 4. First Steps

1. Go to `http://localhost:3000` → Click **"Admin Login"**
2. Login with admin credentials from `.env`
3. **Add Teachers** (Teachers tab) — give them name + password
4. **Add Students** (Students tab) — enter name, Sl.No, contact, class, board
5. Teacher can now login from the main page and take attendance

---

## WhatsApp Setup (Twilio)

### Step 1: Create Twilio Account
1. Sign up at [twilio.com](https://www.twilio.com/)
2. Get your **Account SID** and **Auth Token** from the console

### Step 2: Enable WhatsApp Sandbox
1. Go to **Messaging → Try it out → Send a WhatsApp message**
2. Follow instructions to join the sandbox (send a code from your phone)
3. Note the sandbox number (e.g. `whatsapp:+14155238886`)

### Step 3: For Production (Go Live)
1. Apply for a **Twilio WhatsApp Business Profile**
2. Get a dedicated WhatsApp number
3. Create **Message Templates** (pre-approved by WhatsApp)
4. Update `.env` with production credentials

> **Note:** Without Twilio configured, the system runs in **demo mode** — attendance is saved but WhatsApp messages are logged to console instead of sent.

---

## Go Live — Deployment Steps

### Option A: Deploy on Railway (Easiest)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app/) → New Project → Deploy from GitHub
3. Add environment variables from `.env`
4. Railway gives you a public URL (e.g. `https://dhruv-star-academy.up.railway.app`)

### Option B: Deploy on Render (Free Tier)

1. Push code to GitHub
2. Go to [render.com](https://render.com/) → New Web Service
3. Connect your GitHub repo
4. Set **Build Command:** `npm install`
5. Set **Start Command:** `npm start`
6. Add environment variables
7. Deploy!

### Option C: Deploy on VPS (DigitalOcean/AWS)

```bash
# On your server
git clone https://github.com/Ynshruthie/Dhruv-Star-Academy.git
cd Dhruv-Star-Academy
npm install
cp .env.example .env
# Edit .env with your values
# Install PM2 for process management
npm install -g pm2
pm2 start server.js --name "dhruv-academy"
pm2 save
pm2 startup
```

Use **Nginx** as reverse proxy and **Let's Encrypt** for HTTPS.

---

## Project Structure

```
├── server.js              # Express server entry point
├── database.js            # SQLite database setup & init
├── package.json
├── .env                   # Environment variables (not in git)
├── .env.example           # Template for .env
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── routes/
│   ├── auth.js            # Login endpoints (teacher + admin)
│   ├── students.js        # Student CRUD
│   ├── teachers.js        # Teacher CRUD
│   └── attendance.js      # Attendance + WhatsApp messaging
└── public/
    ├── index.html          # Login page
    ├── attendance.html     # Attendance marking page
    ├── admin.html          # Admin dashboard
    ├── css/
    │   └── style.css
    └── js/
        ├── login.js
        ├── attendance.js
        └── admin.js
```

---

## Default Credentials

| Role | Username/Name | Password |
|------|--------------|----------|
| Admin | admin | admin123 |

⚠️ **Change these immediately after first login!**