const { pool } = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// GET /api/admin/hospitals - 목록 (필터/검색/정렬/페이지네이션)
exports.getHospitals = async (req, res) => {
  try {
    const { status, search, sortField, sortOrder, page = 1, limit = 12 } = req.query;

let where = 'WHERE 1=1';
const params = [];

if (status && status !== 'all') {
  where += ' AND h.status = ?';
  params.push(status);
} else {
  // 승인관리 목록에서는 승인완료된 병원 제외
  where += " AND h.status != 'approved'";
}

    if (search && search.length >= 2) {
      where += ' AND h.name LIKE ?';
      params.push(`%${search}%`);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM hospitals h ${where}`,
      params
    );
    const total = countResult[0].total;
    const allowedFields = { name: 'h.name', created_at: 'h.created_at' };
    let orderBy = 'ORDER BY h.created_at DESC';
    if (sortField && allowedFields[sortField] && sortOrder) {
      orderBy = `ORDER BY ${allowedFields[sortField]} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    }

    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT h.id, h.name, h.status, h.created_at
       FROM hospitals h
       ${where}
       ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('GetHospitals error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// GET /api/admin/hospitals/:id - 상세
exports.getHospitalDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT h.id, h.name, h.ceo_name, h.business_number, h.phone,
              h.address, h.address_detail, h.business_license_path, h.status, h.created_at,
              u.login_id, u.email
       FROM hospitals h
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'hospital'
       WHERE h.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '병원을 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('GetHospitalDetail error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// PATCH /api/admin/hospitals/:id/approve - 승인
exports.approveHospital = async (req, res) => {
  try {
    const { id } = req.params;

// ★ 이전 상태 조회 후 로그
const [beforeStatus] = await pool.query('SELECT status FROM hospitals WHERE id = ?', [id]);
const oldLabel = { pending: '대기', rejected: '반려' }[beforeStatus[0].status] || beforeStatus[0].status;




   await pool.query('UPDATE hospitals SET status = ? WHERE id = ?', ['approved', id]);
await pool.query('UPDATE users SET is_active = TRUE WHERE hospital_id = ? AND role = ?', [id, 'hospital']);


    const [rows] = await pool.query(
      `SELECT h.name, u.email, u.login_id
       FROM hospitals h
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'hospital'
       WHERE h.id = ?`,
      [id]
    );

    if (rows.length > 0 && rows[0].email) {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: rows[0].email,
        subject: '[OsteoAge] 가입 승인 완료 안내',
        html: `
          <div style="max-width:600px; font-family:'Inter',Arial,sans-serif; color:#353535;">
            <p style="font-size:14px; line-height:1.6;">
              안녕하세요, <strong>${rows[0].name}</strong>님.<br/>
              OsteoAge 서비스 가입이 승인되었습니다.
            </p>
            <table style="border-collapse:collapse; width:100%; margin:20px 0;">
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">병원명</td>
                <td style="padding:8px 12px; border:1px solid #ddd;">${rows[0].name}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">ID</td>
                <td style="padding:8px 12px; border:1px solid #ddd;">${rows[0].login_id}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">승인결과</td>
                <td style="padding:8px 12px; border:1px solid #ddd; color:#305b86; font-weight:bold;">승인완료</td>
              </tr>
            </table>
            <p style="font-size:13px; line-height:1.8;">
              지금 바로 로그인하여 서비스를 이용하실 수 있습니다.
            </p>
            <p style="font-size:12px; color:#353535; margin-top:24px;">
              디웨이브주식회사<br/>
              csadmin@diwave.io<br/>
              02-2088-8728 [문의가능시간 : 10:00~17:00 (토·일·공휴일 휴무)]
            </p>
          </div>
        `,
      });
    }

await pool.query(
  `INSERT INTO admin_logs (hospital_id, target_type, target_id, category, details, operator, actor_type)
   VALUES (?, 'approval', ?, '승인상태 변경', ?, ?, 'admin')`,
  [id, id, `[${oldLabel}] → [승인]`, req.user.name || 'admin']
);
    res.json({ success: true, message: '승인 처리되었습니다.' });
  } catch (error) {
    console.error('ApproveHospital error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// PATCH /api/admin/hospitals/:id/reject - 반려
exports.rejectHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, comment } = req.body;
const [beforeStatus] = await pool.query('SELECT status FROM hospitals WHERE id = ?', [id]);
const oldLabel = { pending: '대기', rejected: '반려' }[beforeStatus[0].status] || beforeStatus[0].status;

    await pool.query('UPDATE hospitals SET status = ? WHERE id = ?', ['rejected', id]);
await pool.query('UPDATE users SET is_active = FALSE WHERE hospital_id = ? AND role = ?', [id, 'hospital']);


    const [rows] = await pool.query(
      `SELECT h.name, u.email, u.login_id
       FROM hospitals h
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'hospital'
       WHERE h.id = ?`,
      [id]
    );

    if (rows.length > 0 && rows[0].email) {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: rows[0].email,
        subject: '[OsteoAge] 가입 반려 안내',
        html: `
          <div style="max-width:600px; font-family:'Inter',Arial,sans-serif; color:#353535;">
            <p style="font-size:14px; line-height:1.6;">
              안녕하세요, <strong>${rows[0].name}</strong>님.<br/>
              OsteoAge 서비스 가입 신청이 반려되었습니다.
            </p>
            <table style="border-collapse:collapse; width:100%; margin:20px 0;">
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">병원명</td>
                <td style="padding:8px 12px; border:1px solid #ddd;">${rows[0].name}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">ID</td>
                <td style="padding:8px 12px; border:1px solid #ddd;">${rows[0].login_id}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">승인결과</td>
                <td style="padding:8px 12px; border:1px solid #ddd; color:#e74c3c; font-weight:bold;">${reason}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">Comment</td>
                <td style="padding:8px 12px; border:1px solid #ddd;">${comment || ''}</td>
              </tr>
            </table>
            <p style="font-size:13px; line-height:1.8;">
              사유 확인 후 재신청이 가능합니다.
            </p>
            <p style="font-size:12px; color:#353535; margin-top:24px;">
              디웨이브주식회사<br/>
              csadmin@diwave.io<br/>
              02-2088-8728 [문의가능시간 : 10:00~17:00 (토·일·공휴일 휴무)]
            </p>
          </div>
        `,
      });
    }


await pool.query(
  `INSERT INTO admin_logs (hospital_id, target_type, target_id, category, details, operator, actor_type)
   VALUES (?, 'approval', ?, '승인상태 변경', ?, ?, 'admin')`,
  [id, id, `승인결과 : ${oldLabel} → 반려 / 사유 : [${comment || reason}]`, req.user.name || 'admin']
);

    res.json({ success: true, message: '반려 처리되었습니다.' });
  } catch (error) {
    console.error('RejectHospital error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};


// GET /api/admin/hospitals/accounts - 가입계정 목록
exports.getAccounts = async (req, res) => {
  try {
    const { 
      accountStatus, search, sortField, sortOrder, 
      page = 1, limit = 12,
      startDate, endDate 
    } = req.query;

    let where = "WHERE h.status IN ('approved', 'suspended', 'withdrawn')";

    const params = [];

    // 계정상태 필터 (쉼표 구분: "active,inactive")
    if (accountStatus && accountStatus !== 'all') {
      const statuses = accountStatus.split(',');
      const conditions = [];
      if (statuses.includes('active')) conditions.push('u.is_active = TRUE');
      if (statuses.includes('inactive')) conditions.push('u.is_active = FALSE');
      if (conditions.length > 0) {
        where += ` AND (${conditions.join(' OR ')})`;
      }
    }

    // 가입일 필터
    if (startDate) {
      where += ' AND DATE(h.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND DATE(h.created_at) <= ?';
      params.push(endDate);
    }

    // 검색 (병원명 OR 사업자번호, 하이픈 제거)
    if (search) {
      const cleaned = search.replace(/-/g, '');
      where += ' AND (h.name LIKE ? OR REPLACE(h.business_number, "-", "") LIKE ?)';
      params.push(`%${search}%`, `%${cleaned}%`);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM hospitals h 
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'hospital'
       ${where}`,
      params
    );
    const total = countResult[0].total;

    const allowedFields = {
      login_id: 'u.login_id',
      name: 'h.name',
      email: 'u.email',
      phone: 'h.phone',
      created_at: 'h.created_at',
    };
    let orderBy = 'ORDER BY h.created_at DESC';
    if (sortField && allowedFields[sortField] && sortOrder) {
      orderBy = `ORDER BY ${allowedFields[sortField]} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
    }

    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT h.id, h.name, h.phone, h.status, h.created_at,
              u.login_id, u.email, u.is_active
       FROM hospitals h
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'hospital'
       ${where}
       ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error('GetAccounts error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// GET /api/admin/hospitals/accounts/:id - 계정 상세
exports.getAccountDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT h.id, h.name, h.ceo_name, h.business_number, h.phone,
              h.address, h.address_detail, h.business_license_path, h.status, h.created_at,
              u.login_id, u.email, u.is_active, u.locked_until, u.login_attempts,
              COALESCE(c.balance, 0) as credit_balance
       FROM hospitals h
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'hospital'
       LEFT JOIN credits c ON c.hospital_id = h.id
       WHERE h.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '병원을 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('GetAccountDetail error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// PUT /api/admin/hospitals/accounts/:id - 기본 정보 수정
exports.updateAccountInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ceo_name, phone, email, address, address_detail, business_number } = req.body;

    // ★ 변경 전 데이터 조회 (기존 UPDATE 위에 추가)
    const [before] = await pool.query(
      `SELECT h.name, h.ceo_name, h.phone, h.address, h.address_detail, h.business_number, u.email
       FROM hospitals h
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'hospital'
       WHERE h.id = ?`, [id]
    );
    const old = before[0];
    await pool.query(
      `UPDATE hospitals SET name = ?, ceo_name = ?, phone = ?, address = ?, address_detail = ?, business_number = ?
       WHERE id = ?`,
      [name, ceo_name, phone, address, address_detail, business_number, id]
    );

    // 이메일은 users 테이블
    await pool.query(
      `UPDATE users SET email = ? WHERE hospital_id = ? AND role = 'hospital'`,
      [email, id]
    );

    // ★ 변경 내역 로그
    const beforeLines = [];
    const afterLines = [];
    if (old.name !== name) { beforeLines.push(`병원명 : '${old.name}'`); afterLines.push(`병원명 : '${name}'`); }
    if (old.ceo_name !== ceo_name) { beforeLines.push(`대표자명 : '${old.ceo_name || ''}'`); afterLines.push(`대표자명 : '${ceo_name}'`); }
    if (old.phone !== phone) { beforeLines.push(`연락처 : '${old.phone || ''}'`); afterLines.push(`연락처 : '${phone}'`); }
    if (old.email !== email) { beforeLines.push(`이메일주소 : '${old.email || ''}'`); afterLines.push(`이메일주소 : '${email}'`); }
    if (old.address !== address) { beforeLines.push(`병원주소 : '${old.address || ''}'`); afterLines.push(`병원주소 : '${address}'`); }
    if (old.address_detail !== address_detail) { beforeLines.push(`상세주소 : '${old.address_detail || ''}'`); afterLines.push(`상세주소 : '${address_detail}'`); }
    if (old.business_number !== business_number) { beforeLines.push(`사업자번호 : '${old.business_number || ''}'`); afterLines.push(`사업자번호 : '${business_number}'`); }

    if (beforeLines.length > 0) {
      const details = `변경 전\n${beforeLines.join('\n')}\n변경 후\n${afterLines.join('\n')}`;
      await pool.query(
        `INSERT INTO admin_logs (hospital_id, target_type, target_id, category, details, operator, actor_type)
         VALUES (?, 'account', ?, '정보수정 (기본정보)', ?, ?, 'admin')`,
        [id, id, details, req.user.name || req.user.login_id || 'admin']
      );
    }



    res.json({ success: true, message: '저장되었습니다.' });
  } catch (error) {
    console.error('UpdateAccountInfo error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// PATCH /api/admin/hospitals/accounts/:id/unlock - 로그인 제한 해제
exports.unlockAccount = async (req, res) => {
  try {
    const { id } = req.params;

// ★ 기존 UPDATE 쿼리 아래에 추가
await pool.query(
  `INSERT INTO admin_logs (hospital_id, target_type, target_id, category, details, operator, actor_type)
   VALUES (?, 'account', ?, '로그인 제한 해제', '-', ?, 'admin')`,
  [id, id, req.user.name || 'admin']
);

    await pool.query(
      `UPDATE users SET locked_until = NULL, login_attempts = 0 WHERE hospital_id = ? AND role = 'hospital'`,
      [id]
    );

    res.json({ success: true, message: '로그인 제한이 해제되었습니다.' });
  } catch (error) {
    console.error('UnlockAccount error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};


// POST /api/admin/hospitals/accounts/:id/license - 사업자등록증 변경
exports.uploadBusinessLicense = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: '파일이 없습니다.' });
    }

    // ★ 변경 전 파일명 
    const [oldRows] = await pool.query('SELECT business_license_path FROM hospitals WHERE id = ?', [id]);
    const oldName = oldRows[0]?.business_license_path?.split('/').pop() || '-';


    const filePath = `/uploads/business/${req.file.filename}`;
    await pool.query('UPDATE hospitals SET business_license_path = ? WHERE id = ?', [filePath, id]);
    

        // ★ 로그
    const newName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    await pool.query(
      `INSERT INTO admin_logs (hospital_id, target_type, target_id, category, details, operator, actor_type)
       VALUES (?, 'account', ?, '정보수정 (계정 정보 및 관리)', ?, ?, 'admin')`,
      [id, id, `사업자등록증 : ${oldName} → ${newName}`, req.user.name || 'admin']
    );
    
    res.json({ success: true, data: { path: filePath } });
  } catch (error) {
    console.error('UploadBusinessLicense error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};


// PATCH /api/admin/hospitals/accounts/:id/status - 계정상태 변경
exports.changeAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['active', 'suspended', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 상태값입니다.' });
    }

    // 상태 매핑
    const hospitalStatus = status === 'active' ? 'approved' : status;
    const isActive = status === 'active';

    // ★ 변경 전 상태 조회 (기존 UPDATE 위에 추가)
    const [beforeRows] = await pool.query('SELECT status FROM hospitals WHERE id = ?', [id]);
    const oldLabel = { approved: '정상', suspended: '정지', withdrawn: '탈퇴', pending: '대기', rejected: '반려' }[beforeRows[0].status];
    const newLabel = { active: '정상', suspended: '정지', withdrawn: '탈퇴' }[status];



    await pool.query('UPDATE hospitals SET status = ? WHERE id = ?', [hospitalStatus, id]);
    await pool.query(
      'UPDATE users SET is_active = ? WHERE hospital_id = ? AND role = ?',
      [isActive, id, 'hospital']
    );

    // 안내 메일 발송
    const [rows] = await pool.query(
      `SELECT h.name, u.email, u.login_id
       FROM hospitals h
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'hospital'
       WHERE h.id = ?`,
      [id]
    );

    const statusLabels = { active: '정상', suspended: '정지', withdrawn: '탈퇴' };

    if (rows.length > 0 && rows[0].email) {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: rows[0].email,
        subject: '[OsteoAge] 계정 상태 변경 안내',
        html: `
          <div style="max-width:600px; font-family:'Inter',Arial,sans-serif; color:#353535;">
            <p style="font-size:14px; line-height:1.6;">
              안녕하세요, <strong>${rows[0].name}</strong>님.<br/>
              계정 상태가 변경되었습니다.
            </p>
            <table style="border-collapse:collapse; width:100%; margin:20px 0;">
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">병원명</td>
                <td style="padding:8px 12px; border:1px solid #ddd;">${rows[0].name}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">ID</td>
                <td style="padding:8px 12px; border:1px solid #ddd;">${rows[0].login_id}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">변경상태</td>
                <td style="padding:8px 12px; border:1px solid #ddd; font-weight:bold;">${statusLabels[status]}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; background:#f5f5f5; border:1px solid #ddd; font-weight:bold;">사유</td>
                <td style="padding:8px 12px; border:1px solid #ddd;">${reason || '-'}</td>
              </tr>
            </table>
            <p style="font-size:12px; color:#353535; margin-top:24px;">
              디웨이브주식회사<br/>
              csadmin@diwave.io<br/>
              02-2088-8728 [문의가능시간 : 10:00~17:00 (토·일·공휴일 휴무)]
            </p>
          </div>
        `,
      });
    }


    // ★ 로그 (기존 res.json 위에 추가)
    await pool.query(
      `INSERT INTO admin_logs (hospital_id, target_type, target_id, category, details, operator, actor_type)
       VALUES (?, 'account', ?, '승인상태 변경', ?, ?, 'admin')`,
      [id, id, `[${oldLabel}] → [${newLabel}]`, req.user.name || 'admin']
    );

    res.json({ success: true, message: '계정상태가 변경되었습니다.' });
  } catch (error) {
    console.error('ChangeAccountStatus error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};
// GET /api/admin/hospitals/accounts/:id/logs
exports.getAccountLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, category, details, operator, created_at
       FROM admin_logs
       WHERE hospital_id = ?
       ORDER BY created_at DESC`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GetAccountLogs error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};


// PATCH /api/admin/hospitals/accounts/:id/credit - 크레딧 수동 조정
exports.adjustCredit = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params; // hospital_id
    const { type, amount, reason } = req.body;

    if (!['charge', 'deduct'].includes(type)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 조정 유형입니다.' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: '크레딧 양을 입력해 주세요.' });
    }

    await conn.beginTransaction();

    // 현재 잔액 조회 (없으면 생성)
    const [creditRows] = await conn.query('SELECT balance FROM credits WHERE hospital_id = ?', [id]);
    let currentBalance = 0;
    if (creditRows.length === 0) {
      await conn.query('INSERT INTO credits (hospital_id, balance) VALUES (?, 0)', [id]);
    } else {
      currentBalance = creditRows[0].balance;
    }

    // 잔액 계산
    const newBalance = type === 'charge'
      ? currentBalance + Number(amount)
      : currentBalance - Number(amount);

    if (newBalance < 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: '차감 후 잔액이 0 미만이 됩니다.' });
    }

    // credits 업데이트
    await conn.query('UPDATE credits SET balance = ? WHERE hospital_id = ?', [newBalance, id]);

    // credit_transactions 기록
    const txType = type === 'charge' ? 'charge' : 'use';
    const expiresAt = type === 'charge' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    const source = 'admin_grant';
    await conn.query(
      `INSERT INTO credit_transactions (hospital_id, type, amount, balance_after, description, expires_at, source, is_notified, remaining_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, txType, Number(amount), newBalance, reason, expiresAt, source, 0, type === 'charge' ? Number(amount) : null]
    );


    // admin_logs 기록
    const typeLabel = type === 'charge' ? '지급' : '차감';
    await conn.query(
      `INSERT INTO admin_logs (hospital_id, target_type, target_id, category, details, operator, actor_type)
       VALUES (?, 'account', ?, '크레딧 수동 관리', ?, ?, 'admin')`,
      [id, id, `${typeLabel} : ${amount} / 사유 : [${reason}]`, req.user.name || 'admin']
    );

    await conn.commit();
    res.json({ success: true, data: { balance: newBalance } });
  } catch (error) {
    await conn.rollback();
    console.error('AdjustCredit error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  } finally {
    conn.release();
  }
};
// GET /api/admin/hospitals/accounts/:id/credit-history - 크레딧 이력 조회
exports.getCreditHistory = async (req, res) => {
  try {
    const { id } = req.params; // hospital_id
    const { startDate, endDate, type, page = 1, limit = 12, all } = req.query;

    let where = 'WHERE ct.hospital_id = ?';
    const params = [id];

    // 기간 필터
    if (startDate) {
      where += ' AND DATE(ct.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND DATE(ct.created_at) <= ?';
      params.push(endDate);
    }

    // 유형 필터
    if (type === 'charge') {
      where += " AND ct.type = 'charge'";
    } else if (type === 'use') {
      where += " AND ct.type IN ('use', 'refund')";
    }

    // 총 개수
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM credit_transactions ct ${where}`,
      params
    );
    const total = countResult[0].total;

    // 페이지네이션 (all=true면 전체 반환 - 엑셀용)
    let limitClause = '';
    if (all !== 'true') {
      const offset = (page - 1) * limit;
      limitClause = `LIMIT ${Number(limit)} OFFSET ${offset}`;
    }

    const [rows] = await pool.query(
      `SELECT ct.id, ct.type, ct.amount, ct.balance_after, ct.description,
              ct.analysis_id, ct.payment_id, ct.created_at,
              p.patient_code, p.name as patient_name,
              a.physician
       FROM credit_transactions ct
       LEFT JOIN analyses a ON ct.analysis_id = a.id
       LEFT JOIN patients p ON a.patient_id = p.id
       ${where}
       ORDER BY ct.created_at DESC
       ${limitClause}`,
      params
    );

    // 잔여 크레딧
    const [creditRows] = await pool.query(
      'SELECT COALESCE(balance, 0) as balance FROM credits WHERE hospital_id = ?',
      [id]
    );
    const balance = creditRows.length > 0 ? creditRows[0].balance : 0;

    res.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      balance,
    });
  } catch (error) {
    console.error('GetCreditHistory error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};
