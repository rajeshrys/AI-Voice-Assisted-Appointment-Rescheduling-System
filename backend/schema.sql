-- Hospital Management System Database Schema (PostgreSQL)

-- 1. Doctor Table
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    qualification VARCHAR(100) NOT NULL,
    experience_years INT DEFAULT 0,
    consultation_fee NUMERIC(10, 2) DEFAULT 500.00,
    available_days VARCHAR(100) DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday',
    start_time TIME DEFAULT '09:00:00',
    end_time TIME DEFAULT '17:00:00',
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patient Table
CREATE TABLE IF NOT EXISTS patients (
    patient_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    age INT,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Appointment Table
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    reason TEXT,
    prescription TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);
CREATE INDEX IF NOT EXISTS idx_doctors_spec ON doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- Seed Data (Initial Doctors for testing)
INSERT INTO doctors (first_name, last_name, email, password_hash, phone, specialization, qualification, experience_years, consultation_fee, available_days, start_time, end_time, bio)
VALUES 
('Sarah', 'Jenkins', 'sarah.jenkins@hospital.com', '$2b$10$eE.l0W./60h0u8Yd9jKROeLz1P54T.TfFz8q6/k5V.wWj0mK8x.', '+1 (555) 019-2831', 'Cardiology', 'MD, FACC', 12, 750.00, 'Monday,Tuesday,Wednesday,Thursday,Friday', '09:00:00', '17:00:00', 'Specialist in cardiovascular care, heart failure management, and preventive cardiology.'),
('Marcus', 'Vance', 'marcus.vance@hospital.com', '$2b$10$eE.l0W./60h0u8Yd9jKROeLz1P54T.TfFz8q6/k5V.wWj0mK8x.', '+1 (555) 014-9982', 'Neurology', 'MD, Ph.D.', 15, 900.00, 'Monday,Wednesday,Friday', '10:00:00', '18:00:00', 'Expert in neurodegenerative diseases, stroke recovery, and clinical neurophysiology.'),
('Elena', 'Rostova', 'elena.rostova@hospital.com', '$2b$10$eE.l0W./60h0u8Yd9jKROeLz1P54T.TfFz8q6/k5V.wWj0mK8x.', '+1 (555) 017-3341', 'Pediatrics', 'MD, FAAP', 8, 600.00, 'Monday,Tuesday,Wednesday,Thursday', '08:30:00', '16:30:00', 'Compassionate pediatric healthcare professional focusing on child development and adolescent care.'),
('David', 'Chen', 'david.chen@hospital.com', '$2b$10$eE.l0W./60h0u8Yd9jKROeLz1P54T.TfFz8q6/k5V.wWj0mK8x.', '+1 (555) 012-7711', 'Dermatology', 'MD, FAAD', 10, 650.00, 'Tuesday,Thursday,Friday,Saturday', '09:30:00', '17:30:00', 'Specializes in clinical dermatology, skin oncology, and surgical procedures.'),
('Amara', 'Okonkwo', 'amara.okonkwo@hospital.com', '$2b$10$eE.l0W./60h0u8Yd9jKROeLz1P54T.TfFz8q6/k5V.wWj0mK8x.', '+1 (555) 018-4490', 'Orthopedics', 'MS, M.Ch.', 14, 800.00, 'Monday,Tuesday,Thursday,Friday', '09:00:00', '17:00:00', 'Sub-specialized in joint replacement surgeries, sports medicine, and reconstructive orthopedics.')
ON CONFLICT (email) DO NOTHING;
