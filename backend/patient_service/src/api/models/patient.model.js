const pool  = require("../../infrastructure/config/db")

// create patient
const createPatient = async(patient)=>{
    const {
        first_name,
        last_name,
        email,
        mobile_number,
        alternative_number,
        age,
        appointment_date,
        password_hash
    }= patient;

    const result = await pool.query(`insert into Patient(first_name,last_name,email,mobile_number,alternative_number,age,appointment_date,password_hash) values ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
        first_name,
        last_name,
        email,
        mobile_number,
        alternative_number,
        age,
        appointment_date,
        password_hash
    ]);
    return result.rows[0];
}

// checks if already patient exists
const alreadyexists = async(email)=>{
    const result = await pool.query(`select * from Patient where email = $1`,[email])
    return result.rows[0];
}


module.exports = {
    createPatient,
    alreadyexists
}