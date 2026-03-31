const express = require('express')
const router = express.Router()
const { verifyToken, isAdmin } = require('../middlewares/auth')
const popupController = require('../controllers/popupController')

// 유저용 (인증만 필요, 관리자 아니어도 됨)
router.get('/active', verifyToken, popupController.getActivePopups)

// 관리자용
router.use(verifyToken, isAdmin)

router.get('/', popupController.getPopups)
router.get('/:id', popupController.getPopupDetail)
router.post('/', popupController.createPopup)
router.put('/:id', popupController.updatePopup)
router.patch('/:id/delete', popupController.deletePopup)

module.exports = router
