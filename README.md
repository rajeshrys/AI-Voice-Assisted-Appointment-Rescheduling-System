# 🏥 Hospital Management System (Microservices Architecture)

A modern, full-stack Hospital Management & Appointment System built with a **React + Vite Frontend** and a **Node.js/Express Microservices Backend** powered by **PostgreSQL**.

---

## 🌟 Key Features

- 🩺 **Doctor Service Microservice (Port 5001)**:
  - Doctor Registration & Authentication (JWT & bcrypt password hashing).
  - Doctor Search & Filtering by Specialization, Name, and Availability.
  - Doctor Profile & Working Schedule Management.
- 📅 **Appointment Service Microservice (Port 5002)**:
  - Patient Registration & Authentication.
  - Real-time Slot Availability & Overlap Conflict Prevention.
  - Appointment Booking & Status Management (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
  - Digital Prescription & Clinical Notes Entry for Doctors.
- 💻 **Modern React + Vite Frontend**:
  - Simple, fast, and responsive user interface with **Tailwind CSS**.
  - Interactive Doctor Directory & Specialization Chips.
  - Modal-based Booking Flow and Slot Picker.
  - Separate **Patient Dashboard** and **Doctor Dashboard**.

---

## 🏗️ Architecture Overview

```
hospital-management-system/
├── backend/
│   ├── schema.sql                       # PostgreSQL Database Schema & Seed Data
│   ├── doctor_service/                  # Doctor Microservice (Port 5001)
│   └── appointment_service/             # Appointment & Patient Microservice (Port 5002)
└── frontend/                            # React + Vite Frontend (Port 5173)
```

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

### 4. Frontend Application (`Port 5173`)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Pre-seeded Demo Accounts

- **Doctor**: `sarah.jenkins@hospital.com` | Password: `password123`
- **Doctor**: `marcus.vance@hospital.com` | Password: `password123`
