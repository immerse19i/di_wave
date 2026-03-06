const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const { testConnection } = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: Routes will be added here
// app.use('/api/auth', authRoutes);
// app.use('/api/analyses', analysisRoutes);
// ...


//Routes
const authRoutes =require('./routes/auth');
app.use('/api/auth',authRoutes);

const analysisRoutes = require('./routes/analyses');
app.use('/api/analyses', analysisRoutes);

const patientRoutes = require('./routes/patients');
app.use('/api/patients', patientRoutes);

const termsRoutes = require('./routes/terms');
app.use('/api/terms', termsRoutes);

const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

const hospitalRoutes = require('./routes/hospitals');
app.use('/api/admin/hospitals', hospitalRoutes);

const noticeRoutes = require('./routes/notices')
app.use('/api/admin/notices', noticeRoutes)

const popupRoutes = require('./routes/popups')
app.use('/api/admin/popups', popupRoutes)

const infoRoutes = require('./routes/info')
app.use('/api/info', infoRoutes)

const logsRoutes = require('./routes/logs');
app.use('/api/admin/logs', logsRoutes);

const permissionRoutes = require('./routes/permissions');
app.use('/api/admin/permissions', permissionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: config.nodeEnv === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '요청하신 리소스를 찾을 수 없습니다.'
    });
});

// Start server
async function startServer() {
    await testConnection();

    app.listen(config.port, '0.0.0.0', () => {
        console.log(`✓ Server running on port ${config.port}`);
        console.log(`  Environment: ${config.nodeEnv}`);
        console.log(`  Listening on: 0.0.0.0 (all interfaces)`);
    });
}

startServer();

module.exports = app;
