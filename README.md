# 🏥 Hospital Management System (API Gateway + Microservices Architecture)

A modern, full-stack Hospital Management & Appointment System built with a **React + Vite Frontend**, an **API Gateway**, and specialized **Node.js/Express Microservices** powered by **PostgreSQL**.

---

## 🌐 Single Entry Point Architecture (API Gateway)

All frontend interactions connect exclusively through **ONE single port**: **API Gateway (`http://localhost:5000`)**.
The API Gateway seamlessly proxies and load balances traffic to the underlying microservices:

```
                               ┌────────────────────────────────┐
                               │     React Frontend (Port 5173) │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │    API Gateway (Port 5000)       │
                              └────────┬─────────────────┬───────┘
                                       │                 │
                   ┌───────────────────┘                 └───────────────────┐
                   ▼                                                         ▼
    ┌──────────────────────────────┐                         ┌──────────────────────────────┐
    │ Doctor Service (Port 5001)   │                         │ Appointment Service          │
    │ /api/doctors                 │                         │ (Port 5002)                  │
    └──────────────────────────────┘                         │ /api/patients, /api/appointments
                                                             └──────────────────────────────┘
```

---

## 🌟 Key Features

- 🌐 **API Gateway (`Port 5000`)**: Single entry point for all frontend API calls.
- 🩺 **Doctor Service (`Port 5001`)**: Doctor profiles, specializations, schedule & availability.
- 📅 **Appointment Service (`Port 5002`)**: Patient authentication, slot conflict resolution, appointment scheduling, and digital prescriptions.
- 💻 **React + Vite Frontend**: Clean UI with Tailwind CSS, Doctor Search, Patient Dashboard, and Doctor Dashboard.

---

## 🚀 Quick Setup Instructions

### 1. Database Setup
```bash
createdb -U postgres hospital_db
psql -U postgres -d postgres -f backend/schema.sql
```

### 2. Doctor Microservice (`Port 5001`)
```bash
cd backend/doctor_service
npm install
npm run dev
```

### 3. Appointment Microservice (`Port 5002`)
```bash
cd backend/appointment_service
npm install
npm run dev
```

### 4. API Gateway (`Port 5000`)
```bash
cd backend/api_gateway
npm install
npm run dev
```

### 5. Frontend Application (`Port 5173`)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Pre-seeded Demo Accounts

- **Doctor**: `sarah.jenkins@hospital.com` | Password: `password123`
- **Doctor**: `marcus.vance@hospital.com` | Password: `password123`
