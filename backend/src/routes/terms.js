const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const termsController = require('../controllers/termsController');

// multer 설정 (PDF 전용)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/terms'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('PDF 파일만 업로드 가능합니다.'));
    }
  }
});

// === 유저단 (인증 불필요) ===
// 공개 약관 목록
router.get('/public', termsController.getPublicTerms);

// PDF 파일 다운로드/뷰어
router.get('/:id/file', termsController.getTermFile);

// === 관리자단 ===
// 전체 약관 목록 (현재 버전만)
router.get('/admin', verifyToken, isAdmin, termsController.getAdminTerms);

// 약관 이름 수정
router.put('/admin/:id/name', verifyToken, isAdmin, termsController.updateTermName);

// PDF 파일 업로드 (새 버전)
router.post('/admin/:type/upload', verifyToken, isAdmin, upload.single('file'), termsController.uploadTermFile);

// 공개/비공개 토글
router.put('/admin/:id/toggle', verifyToken, isAdmin, termsController.toggleTermPublic);

// 이전약관 이력 조회
router.get('/admin/:type/history', verifyToken, isAdmin, termsController.getTermHistory);

module.exports = router;
