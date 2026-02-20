const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
router.get('/check', verifyToken, patientController.checkPatient);

router.get('/check', auth, patientController.checkPatient);

module.exports = router;
