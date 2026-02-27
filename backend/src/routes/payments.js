const express = require('express')
const router = express.Router()
const { confirmPayment } = require('../controllers/paymentController')
const { authenticate } = require('../middlewares/auth')

const { verifyToken } = require('../middlewares/auth')

router.post('/confirm', verifyToken, confirmPayment)


module.exports = router
