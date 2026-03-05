const express = require('express')
const router = express.Router()
const { verifyToken, isAdmin } = require('../middleware/auth')
const infoController = require('../controllers/infoController')

// 유저용 (인증 필요)
router.get('/', verifyToken, infoController.getInfo)

// 관리자용
router.get('/admin', verifyToken, isAdmin, infoController.getInfo)
router.put('/admin', verifyToken, isAdmin, infoController.updateInfo)

module.exports = router
