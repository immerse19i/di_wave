const express =require('express');
const router =express.Router();
const multer = require('multer')
const path = require('path');
const config =require('../config/config');
const analysisController = require('../controllers/analysisController');
const {verifyToken} = require('../middlewares/auth');

// multer 설정 (이미지)

const storage = multer.diskStorage({
    destination : (req, file, cb) => {
        cb(null,path.join(__dirname, '../../uploads/xray'));
    },
    filename: (req, file, cb)=> {
        const uniqueName = `${Date.now()}-${Math.round(Math.random()* 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {fileSize: config.upload.maxFileSize},
    fileFilter: (req,file,cb)=> {
        const allowed = [ '.jpg', '.jpeg', '.png', '.dcm'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)){
            cb(null, true);
        }else{
            cb(new Error('지원하지 않는 파일 형식'))
        }
    }
})

// 분석 요청 (이미지 업로드 + 예측)
router.post ('/', verifyToken, upload.single('image'), analysisController.createAnalysis);

// 목록 조회
router.get('/', verifyToken, analysisController.getAnalyses);

// 상세 조회
router.get('/:id', verifyToken, analysisController.getAnalysis);

module.exports = router;