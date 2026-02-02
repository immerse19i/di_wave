const bcrypt = require('bcryptjs');
const jwt =  require('jsonwebtoken');
const {pool} = require('../config/database');
const config = require('../config/config');


//로긩
exports.login = async (req,res)=> {
  try{
    //id로 사용자 조회
const { loginId, password } = req.body;
const [users] = await pool.query(
  'SELECT * FROM users WHERE login_id = ? AND is_active = 1',
  [loginId]
);
    if (users.length === 0){
      return res.status(401).json({message: '이메일 또는 비밀번호가 올바르지 않습니다.'})
    }

    const user = users[0];

    //비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) {
      return res.status(401).json({message: '이메일 또는 비밀번호가 올바르지 않습니다.'});
    }

    //JWT 토큰 생성
    const token = jwt.sign(
      {id: user.id, hospital_id: user.hospital_id , role: user.role}, 
      config.jwt.secret, 
      {expiresIn: config.jwt.expiresIn}
    )


    //마지막 로그인 시간
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hospital_id: user.hospital_id
      }
    });


  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({message: '서버 오류 발생'});
  }
}

exports.logout = async (req, res) => {
  // JWT는 서버에서 무효화 할 수 없음 (클라이언트에서 토큰 삭제)
  res.json({message: '로그아웃 되었습니다.'});
}

// 내 정보 조회
exports.getMe = async (req,res) => {
  try{
    const  [users] = await pool.query(
      `SELECT u.id, u.login_id, u.email, u.name, u.role, u.hospital_id, u.last_login,
              h.name as hospital_name, h.ceo_name, h.phone, 
              h.address, h.address_detail, h.business_number, 
              h.business_license_path, h.status as hospital_status
       FROM users u
       LEFT JOIN hospitals h ON u.hospital_id = h.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (users.length === 0){
      return res.status(404).json({message: '사용자를 찾을 수  없습니다.'});
    }
    res.json(users[0]);
  } catch (error) {
    console.error('GetMe error', error);
    res.status(500).json({message: '서버 오류가 발생했습니다.'});
  }
};


// 비밀번호 변경
exports.changePassword = async (req,res) => {
  try{
    const { currentPassword, newPassword} = req.body;
    // 현재 비밀번호 확인
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(400).json({message: '현재 비밀번호가 올바르지 않습니다.'});
    }
    
      // 새 비번 해시화 후 저장
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    
      res.json({message : '비밀번호가 변경되었습니다.'});
  } catch (error) {
    console.error('ChangePassword error: ', error);
    res.status(500).json({message: '서버 오류가 발생했습니다.'});
  }
};

