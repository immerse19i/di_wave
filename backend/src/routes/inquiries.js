const express = require('express')
const router = express.Router()
const { verifyToken, isAdmin } = require('../middlewares/auth')
const inquiryController = require('../controllers/inquiryController')
const multer = require('multer')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/inquiries/'),
  filename: (req, file, cb) => {
    const original = Buffer.from(file.originalname, 'latin1').toString('utf8')
    cb(null, `${Date.now()}_${original}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('허용되지 않는 파일 형식입니다'), false)
  }
})

// ===== 유저용 (verifyToken만) =====
router.post('/', verifyToken, upload.array('attachments', 5), inquiryController.createInquiry)
router.get('/my', verifyToken, inquiryController.getMyInquiries)
router.get('/my/:id', verifyToken, inquiryController.getMyInquiryDetail)

// ===== 관리자용 =====
router.use(verifyToken, isAdmin)
router.get('/counts', inquiryController.getInquiryCounts)  // 추가
router.get('/', inquiryController.getInquiries)
router.get('/:id', inquiryController.getInquiryDetail)
router.patch('/:id/answer', inquiryController.answerInquiry)

module.exports = router
