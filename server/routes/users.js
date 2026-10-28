const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const dataStore = require('../data/dataStore');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All endpoints in this router are Admin only
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await dataStore.getUsers();
    // Return sanitized users (no password hashes)
    const sanitized = users.map(u => ({
      user_id: u.user_id,
      username: u.username,
      name: u.name,
      role: u.role
    }));
    res.json(sanitized);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = await dataStore.findUser(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await dataStore.createUser({
      username: username.toLowerCase().trim(),
      password_hash,
      role: role === 'admin' ? 'admin' : 'billing',
      name: name?.trim() || username
    });

    res.status(201).json({
      user_id: newUser.user_id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const users = await dataStore.getUsers();
    const target = users.find(u => u.user_id === id);

    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.username === 'admin' || target.user_id === req.user.user_id) {
      return res.status(400).json({ error: 'Cannot delete the primary admin account' });
    }

    await dataStore.deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/users/:id/password
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    if (!new_password || new_password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    const updated = await dataStore.updateUser(id, {
      password_hash
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
