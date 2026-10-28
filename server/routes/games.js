const express = require('express');
const router = express.Router();
const dataStore = require('../data/dataStore');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/games - Authenticated (Billing or Admin can view)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let games = await dataStore.getGames();
    if (req.query.active === 'true') {
      games = games.filter(g => g.active === true);
    }
    res.json(games);
  } catch (err) {
    console.error('Error fetching games:', err);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// POST /api/games - Admin only
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, price_per_person, station_count } = req.body;
    if (!name || price_per_person === undefined) {
      return res.status(400).json({ error: 'Game name and price per person are required' });
    }

    const newGame = await dataStore.createGame({
      name,
      price_per_person: Number(price_per_person),
      active: true,
      station_count: Number(station_count) || 1
    });

    res.status(201).json(newGame);
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// PUT /api/games/:id - Admin only
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price_per_person, active, station_count } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (price_per_person !== undefined) updates.price_per_person = Number(price_per_person);
    if (active !== undefined) updates.active = Boolean(active);
    if (station_count !== undefined) updates.station_count = Number(station_count);

    const updated = await dataStore.updateGame(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating game:', err);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// PATCH /api/games/:id/toggle - Admin only (soft delete / toggle active)
router.patch('/:id/toggle', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const game = await dataStore.getGameById(id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const updated = await dataStore.updateGame(id, { active: !game.active });
    res.json(updated);
  } catch (err) {
    console.error('Error toggling game status:', err);
    res.status(500).json({ error: 'Failed to toggle game status' });
  }
});

module.exports = router;
