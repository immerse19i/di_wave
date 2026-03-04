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

    let where = "WHERE h.status IN ('approved', 'suspended')";
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
