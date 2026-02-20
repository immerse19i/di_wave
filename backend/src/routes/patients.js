const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const patientController = require('../controllers/patientController');

router.get('/check', verifyToken, patientController.checkPatient);

module.exports = router;
