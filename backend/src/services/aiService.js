const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const config =require('../config/config');


async function predictBoneAge(imagePath, patientData){
    const form =new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('sex', patientData.sex);
    form.append('height',patientData.height);
    form.append('age_months', patientData.ageMonths);

    if(patientData.fatherHeight){
        form.append('father_height', patientData.fatherHeight);

    }
    if (patientData.motherHeight) {
        form.append('mother_height', patientData.motherHeight);
    }

    const response = await axios.post(
        `${config.ai.serverUrl}/predict`,
        form,
        {
            headers: form.getHeaders(),
            timeout: 120000
        }
    );

    return response.data

}

async function recalculatePAH(data) {
    const response = await axios.post(
        `${config.ai.serverUrl}/recalculate`,
        {
            bone_age_years: data.boneAgeYears,
            bone_age_months: data.boneAgeMonths,
            sex: data.sex,
            height: data.height,
            age_months: data.ageMonths,
            father_height: data.fatherHeight || null,
            mother_height: data.motherHeight || null
        },
        { timeout: 30000 }
    );
    return response.data;
}

module.exports = {predictBoneAge, recalculatePAH};