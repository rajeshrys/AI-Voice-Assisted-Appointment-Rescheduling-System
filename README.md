# 🏥 Hospital Management System (Unified Backend)

A modern, full-stack Hospital Management & Appointment System built with a **React + Vite Frontend** and a **Unified Node.js/Express Backend** powered by **PostgreSQL**.

---

## 🚀 Simple Production Deployment (Render)

Now you only need to deploy **2 services** on Render:

1. **`backend`** (Web Service on Render)
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Environment Variable: `DATABASE_URL` = *(Your Render PostgreSQL DB URL)*

2. **`frontend`** (Static Site on Render)
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variable: `VITE_API_GATEWAY_URL` = `https://your-backend-service.onrender.com/api`

---

## 💻 Local Running Instructions

### 1. Database Setup
```bash
createdb -U postgres hospital_db
psql -U postgres -d postgres -f backend/schema.sql
```

### 2. Backend Service (`Port 5000`)
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend App (`Port 5173`)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Pre-seeded Demo Accounts

- **Doctor**: `sarah.jenkins@hospital.com` | Password: `password123`
- **Doctor**: `marcus.vance@hospital.com` | Password: `password123`
