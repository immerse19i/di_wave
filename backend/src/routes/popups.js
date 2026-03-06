const express = require('express')
const router = express.Router()
const { verifyToken, isAdmin } = require('../middlewares/auth')
const popupController = require('../controllers/popupController')

router.use(verifyToken, isAdmin)

router.get('/', popupController.getPopups)
router.get('/:id', popupController.getPopupDetail)
router.post('/', popupController.createPopup)
router.put('/:id', popupController.updatePopup)
router.patch('/:id/delete', popupController.deletePopup)

module.exports = router
