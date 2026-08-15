CREATE TABLE Patient(
        Patient_Id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL, 
        email VARCHAR(100) UNIQUE NOT NULL,
        mobile_number VARCHAR(25) NOT NULL,
        alternative_number VARCHAR(25),
        age INT,
        appointment_date DATE,
        password_hash TEXT
   )