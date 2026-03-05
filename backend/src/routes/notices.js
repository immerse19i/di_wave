const express = require('express')
const router = express.Router()
const { verifyToken, isAdmin } = require('../middlewares/auth')
const noticeController = require('../controllers/noticeController')
const multer = require('multer')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/notices/'),
  filename: (req, file, cb) => {
    const original = Buffer.from(file.originalname, 'latin1').toString('utf8')
    cb(null, `${Date.now()}_${original}`)
  }
})
const upload = multer({ storage })

router.use(verifyToken, isAdmin)

// 목록 조회
router.get('/', noticeController.getNotices)

// 상세 조회
router.get('/:id', noticeController.getNoticeDetail)

// 생성
router.post('/', upload.single('attachment'), noticeController.createNotice)

// 수정
router.put('/:id', upload.single('attachment'), noticeController.updateNotice)

// 삭제 (상태변경)
router.patch('/:id/delete', noticeController.deleteNotice)

module.exports = router
