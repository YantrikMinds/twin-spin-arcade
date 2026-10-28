const express = require('express');
const router = express.Router();
const dataStore = require('../data/dataStore');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Helper to get YYYY-MM-DD in IST
function getISTDateString(dateVal) {
  const d = dateVal ? new Date(dateVal) : new Date();
  const opt = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat('en-CA', opt).format(d);
}

// GET /api/reports/dashboard - Admin only (or general stats for billing overview)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const today = getISTDateString();
    const allTickets = await dataStore.getTickets();
    const allGames = await dataStore.getGames();

    // Filter today's tickets in IST
    const todayTickets = allTickets.filter(t => {
      if (!t.created_at) return false;
      return getISTDateString(t.created_at) === today || t.created_at.startsWith(today);
    });

    let todaySales = 0;
    let todayPlayers = 0;
    const paymentModeCounts = { cash: 0, upi: 0 };

    todayTickets.forEach(t => {
      todaySales += Number(t.total_amount) || 0;
      const isUpi = (t.payment_mode === 'upi' || t.payment_mode === 'qr');
      if (isUpi) paymentModeCounts.upi++;
      else paymentModeCounts.cash++;

      (t.items || []).forEach(item => {
        todayPlayers += Number(item.no_of_persons) || 0;
      });
    });

    // Breakdown by game
    const gameStats = {};
    allGames.forEach(g => {
      gameStats[g.game_id] = {
        game_id: g.game_id,
        name: g.name,
        price_per_person: g.price_per_person,
        total_tickets: 0,
        total_persons: 0,
        total_revenue: 0
      };
    });

    todayTickets.forEach(t => {
      (t.items || []).forEach(item => {
        if (!gameStats[item.game_id]) {
          gameStats[item.game_id] = {
            game_id: item.game_id,
            name: item.game_name,
            price_per_person: item.price_at_booking,
            total_tickets: 0,
            total_persons: 0,
            total_revenue: 0
          };
        }
        gameStats[item.game_id].total_tickets += 1;
        gameStats[item.game_id].total_persons += Number(item.no_of_persons) || 0;
        gameStats[item.game_id].total_revenue += Number(item.subtotal) || 0;
      });
    });

    const pendingSheetSync = allTickets.filter(t => t.payment_status === 'paid' && !t.synced_to_sheet).length;

    res.json({
      today_date: today,
      today_sales: todaySales,
      today_tickets: todayTickets.length,
      today_players: todayPlayers,
      payment_modes: { ...paymentModeCounts, qr: paymentModeCounts.upi },
      sales_by_game: Object.values(gameStats),
      recent_tickets: allTickets.slice(0, 10),
      total_historical_tickets: allTickets.length,
      pending_sheet_sync: pendingSheetSync
    });
  } catch (err) {
    console.error('Error generating dashboard report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
