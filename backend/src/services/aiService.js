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

module.exports = {predictBoneAge};