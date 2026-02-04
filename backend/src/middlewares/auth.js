const jwt = require('jsonwebtoken');
const config = require('../config/config');


// JWT 토큰 검증
exports.verifyToken = (req,res, next) => {
  try {
    // 헤더 토큰 추출
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({message : '인중 토큰이 필요 합니다.'});
    }

    const token = authHeader.split(' ')[1];
    // 토큰 검증
    const decoded = jwt.verify(token, config.jwt.secret);
  
    // req.user 에 사용자 정보 저장 ( 다음 미들웨어/ 컨트롤러에서 사용)
  
    req.user = decoded;
  
    next();
  }
  catch (error) {
    if (error.name = 'TokenExpiredError'){
      return res.status(401).json({message: '토큰이 만료되었습니다.'});
    }
    return res.status(401).json({message: '유효하지 않은 토큰입니다.'});
}   
};

//관리자 권한 확인 미들웨어

exports.isAdmin = (req,res,next)=> {
  if(req.user.role !== 'admin'){
    return res.status(403).json({ message: '관리자 권한이 필요합니다.'});
  }
  next();
}
