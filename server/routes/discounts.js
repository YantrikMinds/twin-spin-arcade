const express = require('express');
const router = express.Router();
const dataStore = require('../data/dataStore');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Helper to get current IST Date and Time components
function getISTDateTime() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
  });
  const parts = formatter.formatToParts(new Date());
  const map = {};
  parts.forEach(p => map[p.type] = p.value);

  const yyyy = map.year;
  const mm = map.month;
  const dd = map.day;
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const rawHour = map.hour === '24' ? '00' : map.hour;
  const hour = String(rawHour).padStart(2, '0');
  const minute = String(map.minute).padStart(2, '0');
  const timeStr = `${hour}:${minute}`;
  const weekday = (map.weekday || '').toLowerCase().slice(0, 3); // 'mon', 'tue', etc.

  return { dateStr, timeStr, weekday };
}

// Function to check if a discount is currently active right now
function isDiscountCurrentlyActive(d, istNow = getISTDateTime()) {
  if (!d.active) return false;

  const { dateStr, timeStr, weekday } = istNow;

  // 1. Date Range Check (start_date & end_date)
  if (d.start_date && d.start_date > dateStr) return false;
  if (d.end_date && d.end_date < dateStr) return false;

  // 2. Day of Week Check (days_of_week)
  if (Array.isArray(d.days_of_week) && d.days_of_week.length > 0) {
    const normalizedDays = d.days_of_week.map(s => String(s).toLowerCase().slice(0, 3));
    if (!normalizedDays.includes('all') && !normalizedDays.includes(weekday)) {
      return false;
    }
  }

  // 3. Time Window Check (start_time & end_time in HH:MM)
  if (d.start_time && d.end_time) {
    if (d.start_time <= d.end_time) {
      // Daytime window, e.g. 14:00 to 18:00
      if (timeStr < d.start_time || timeStr > d.end_time) {
        return false;
      }
    } else {
      // Overnight window, e.g. 22:00 to 02:00
      if (timeStr < d.start_time && timeStr > d.end_time) {
        return false;
      }
    }
  } else if (d.start_time && !d.end_time) {
    if (timeStr < d.start_time) return false;
  } else if (!d.start_time && d.end_time) {
    if (timeStr > d.end_time) return false;
  }

  return true;
}

// GET /api/discounts - Authenticated
router.get('/', authenticateToken, async (req, res) => {
  try {
    const istNow = getISTDateTime();
    const discounts = await dataStore.getDiscounts();

    // Attach is_currently_live flag to all discounts
    const enriched = discounts.map(d => ({
      ...d,
      is_currently_live: isDiscountCurrentlyActive(d, istNow)
    }));

    if (req.query.active === 'true') {
      return res.json(enriched.filter(d => d.is_currently_live));
    }

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching discounts:', err);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
});

// POST /api/discounts - Admin only
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, type, value, applies_to, start_date, end_date, start_time, end_time, days_of_week, auto_apply } = req.body;
    if (!name || !value) {
      return res.status(400).json({ error: 'Discount name and value are required' });
    }

    const newDisc = await dataStore.createDiscount({
      name,
      type: type === 'percentage' ? 'percentage' : 'flat',
      value: Number(value),
      active: true,
      applies_to: applies_to || 'all',
      start_date: start_date || '',
      end_date: end_date || '',
      start_time: start_time || '',
      end_time: end_time || '',
      days_of_week: Array.isArray(days_of_week) ? days_of_week : [],
      auto_apply: Boolean(auto_apply)
    });

    res.status(201).json(newDisc);
  } catch (err) {
    console.error('Error creating discount:', err);
    res.status(500).json({ error: 'Failed to create discount' });
  }
});

// PUT /api/discounts/:id - Admin only
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, value, active, applies_to, start_date, end_date, start_time, end_time, days_of_week, auto_apply } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (value !== undefined) updates.value = Number(value);
    if (active !== undefined) updates.active = Boolean(active);
    if (applies_to !== undefined) updates.applies_to = applies_to;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (days_of_week !== undefined) updates.days_of_week = Array.isArray(days_of_week) ? days_of_week : [];
    if (auto_apply !== undefined) updates.auto_apply = Boolean(auto_apply);

    const updated = await dataStore.updateDiscount(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating discount:', err);
    res.status(500).json({ error: 'Failed to update discount' });
  }
});

// PATCH /api/discounts/:id/toggle - Admin only
router.patch('/:id/toggle', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const discounts = await dataStore.getDiscounts();
    const disc = discounts.find(d => d.discount_id === id);
    if (!disc) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    const updated = await dataStore.updateDiscount(id, { active: !disc.active });
    res.json(updated);
  } catch (err) {
    console.error('Error toggling discount status:', err);
    res.status(500).json({ error: 'Failed to toggle discount status' });
  }
});

module.exports = router;
