require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    db: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'di_wave'
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'default_secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },

    upload: {
        path: process.env.UPLOAD_PATH || './uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
    },

    ai: {
        pythonPath: process.env.PYTHON_PATH || 'python',
        scriptPath: process.env.AI_SCRIPT_PATH || './ai/predict.py'
    },

    credit: {
        perAnalysis: parseInt(process.env.CREDIT_PER_ANALYSIS) || 1
    }
};
