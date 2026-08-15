const patientmodel = require('../models/patient.model');
const googleAuthService = require('../../services/google.authservice');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { response } = require('../../app');


// Patient registration
async function register(req,res){
    try{
        const patient = req.body;

        if(!patient){
            return res.status(401).json({
                message: "Missing required fields"
            })
        }

        const {email,password_hash} = patient;
        
        const exists = await patientmodel.alreadyexists(email)

        if(exists){
            return res.status(409).json({
                message: "Patient already exists"
            })
        }
        const hashpassword = await bcrypt.hash(password_hash,10)
        patient.password_hash = hashpassword;

        const newpatient = await patientmodel.createPatient(patient)

        // token 
        const token = jwt.sign(
        { patientId: newpatient.patient_id },
        process.env.JWT_SECRET,
    { expiresIn: "1h" })

    // sending token
    res.cookie('token',token,{
        httpOnly: true,
        secure: process.env.NODE_ENV = 'production',
        samesite: process.env.NODE_ENV === 'production ' ? 'none' : 'lax',
        maxAge: 60* 60* 24
    })
    res.status(201).json({
        message:"Registration successful",
        newpatient
    })
}catch(error){
    return res.status(500).json({
        message: "Registration Failed"
    })
    }

}

// Patient Login
async function login(req,res){
    try {
        const {email,password} = req.body;
        if(!email ||  !password){
            return res.status(401).json({
                message:"Missing email,password"
            })
        }
        const exists = await patientmodel.alreadyexists(email)
        if(!exists){
            return res.status(404).json({
                message: "Email is not registered"
            })
        }
        const verifypass = await bcrypt.compare(password,exists.password_hash)
        if(!verifypass){
            return res.status(401).json({
                message:"Wrong password"
            })
        }
                // token 
        const token = jwt.sign(
        { patientId: exists.patient_id },
        process.env.JWT_SECRET,
    { expiresIn: "1h" })

    // sending token through cookies
    res.cookie('token',token)
    res.status(200).json({
        message:"Login successful",
        exists
    })
        
    } catch(error){
    return res.status(500).json({
        message: "Login Failed"
    })
    }
}



module.exports = {
    register,
    login
};