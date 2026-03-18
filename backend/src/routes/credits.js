const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middlewares/auth')
const creditController = require('../controllers/creditController')

router.get('/my', verifyToken, creditController.getMyCreditHistory)

module.exports = router
