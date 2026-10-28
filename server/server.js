const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config/default');
const dataStore = require('./data/dataStore');

const authRoutes = require('./routes/auth');
const gamesRoutes = require('./routes/games');
const discountsRoutes = require('./routes/discounts');
const ticketsRoutes = require('./routes/tickets');
const queueRoutes = require('./routes/queue');
const settingsRoutes = require('./routes/settings');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const { retryPendingSheetSync } = require('./data/sheetsWebhook');

const app = express();

// Security headers (CSP disabled so local static assets and thermal print styles are unhindered)
app.use(helmet({ contentSecurityPolicy: false }));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prevent caching of API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Twin Spin Arcade Management System'
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/discounts', discountsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);

// Serve static frontend build if present
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), err => {
    if (err) next();
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(config.PORT, async () => {
  console.log(`Server running on port ${config.PORT}`);
  try {
    const adminUser = await dataStore.findUser('admin');
    if (adminUser && adminUser.password_hash) {
      const isDefault = await bcrypt.compare('admin123', adminUser.password_hash);
      if (isDefault) {
        console.warn('[WARNING] Default admin password is still active — change it in Admin -> Settings -> Users before going live.');
      }
    }
  } catch (err) {
    // Non-fatal check
  }

  // Background retry job for Google Sheet syncing (runs every 3 minutes)
  setInterval(retryPendingSheetSync, 3 * 60 * 1000);
  setTimeout(retryPendingSheetSync, 5000);
});
