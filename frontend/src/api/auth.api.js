import api from "./client";

export const registerpatient = async (patientdata)=>{
    const response = await api.post("/api/auth/register",patientdata)
    return response.data;
}

export const loginpatient = async(patientdata)=>{
    const response = await api.post('/api/auth/login',patientdata)
    return response.data;
    
}