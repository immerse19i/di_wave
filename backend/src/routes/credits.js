const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middlewares/auth')
const creditController = require('../controllers/creditController')

router.get('/my', verifyToken, creditController.getMyCreditHistory)
router.post('/expire-check', verifyToken, creditController.expireCheck)
router.get('/expiring', verifyToken, creditController.getExpiring)
router.get('/unnotified-grants', verifyToken, creditController.getUnnotifiedGrants)
router.patch('/mark-notified', verifyToken, creditController.markNotified)

module.exports = router
