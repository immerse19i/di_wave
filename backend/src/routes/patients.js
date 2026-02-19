const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const patientController = require('../controllers/patientController');

router.get('/check', auth, patientController.checkPatient);

module.exports = router;
