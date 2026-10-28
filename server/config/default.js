const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing — set it in server/.env');
}

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: '7d',
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '',
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '',
  DEFAULT_PRINTER_WIDTH: '58mm',
};
