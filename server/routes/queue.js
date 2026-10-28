const express = require('express');
const router = express.Router();
const dataStore = require('../data/dataStore');
const { authenticateToken } = require('../middleware/auth');

// TODO: multi-station support — if a game ever gets station_count > 1, now_playing needs to become an array of concurrent sessions instead of one slot. Not implemented yet since every game is currently a single unit.

// Helper to get YYYY-MM-DD in IST
function getISTDateString(dateVal) {
  const d = dateVal ? new Date(dateVal) : new Date();
  const opt = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat('en-CA', opt).format(d);
}

/**
 * GET /api/queue
 * Returns physical station state and queues for all active games:
 * - Station name & info
 * - now_playing: { ticket_id, customer_name, no_of_persons, started_at } or null
 * - waiting_queue: [ { position: 1, ticket_id, customer_name, no_of_persons, created_at }, ... ]
 * - completed_count: number of sessions completed today
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const games = await dataStore.getGames();
    const activeGames = games.filter(g => g.active);
    
    // Get today in IST
    const today = getISTDateString();
    const tickets = await dataStore.getTickets();

    const stations = activeGames.map(game => {
      let nowPlaying = null;
      const waitingList = [];
      let completedCount = 0;

      // Scan all tickets for this game
      tickets.forEach(ticket => {
        (ticket.items || []).forEach(item => {
          if (item.game_id === game.game_id) {
            const isToday = ticket.created_at && (getISTDateString(ticket.created_at) === today || ticket.created_at.startsWith(today));
            if (item.queue_status === 'playing' && !nowPlaying) {
              nowPlaying = {
                ticket_id: ticket.ticket_id,
                item_id: item.item_id,
                customer_name: ticket.customer_name,
                customer_phone: ticket.customer_phone,
                no_of_persons: item.no_of_persons,
                started_at: item.started_at || ticket.created_at
              };
            } else if (item.queue_status === 'waiting') {
              waitingList.push({
                ticket_id: ticket.ticket_id,
                item_id: item.item_id,
                customer_name: ticket.customer_name,
                customer_phone: ticket.customer_phone,
                no_of_persons: item.no_of_persons,
                created_at: ticket.created_at
              });
            } else if (item.queue_status === 'completed' && isToday) {
              completedCount++;
            }
          }
        });
      });

      // Sort waiting queue oldest first (FIFO)
      waitingList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const waitingQueue = waitingList.map((item, idx) => ({
        ...item,
        position: idx + 1
      }));

      return {
        game_id: game.game_id,
        game_name: game.name,
        price_per_person: game.price_per_person,
        station_count: game.station_count || 1,
        now_playing: nowPlaying,
        waiting_queue: waitingQueue,
        waiting_count: waitingQueue.length,
        completed_today_count: completedCount
      };
    });

    res.json(stations);
  } catch (err) {
    console.error('Error fetching queue:', err);
    res.status(500).json({ error: 'Failed to fetch queue stations' });
  }
});

/**
 * POST /api/queue/start
 * Promotes a waiting ticket session to "playing".
 * Body: { ticket_id, item_id }
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { ticket_id, item_id } = req.body;
    if (!ticket_id) {
      return res.status(400).json({ error: 'ticket_id is required' });
    }

    const ticket = await dataStore.getTicketById(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    let itemUpdated = false;
    const updatedItems = (ticket.items || []).map(item => {
      if (!item_id || item.item_id === item_id) {
        if (item.queue_status === 'waiting') {
          itemUpdated = true;
          return {
            ...item,
            queue_status: 'playing',
            started_at: new Date().toISOString()
          };
        }
      }
      return item;
    });

    if (!itemUpdated) {
      return res.status(400).json({ error: 'No waiting item found to start for this ticket' });
    }

    const updatedTicket = await dataStore.updateTicket(ticket_id, {
      items: updatedItems,
      queue_status: 'playing'
    });

    res.json({ message: 'Session started', ticket: updatedTicket });
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ error: 'Failed to start queue session' });
  }
});

/**
 * POST /api/queue/end
 * Marks a playing ticket session as "completed".
 * If auto_promote is true, promotes the next waiting session for that game!
 * Body: { ticket_id, item_id, auto_promote: boolean }
 */
router.post('/end', authenticateToken, async (req, res) => {
  try {
    const { ticket_id, item_id, auto_promote = true } = req.body;
    if (!ticket_id) {
      return res.status(400).json({ error: 'ticket_id is required' });
    }

    const ticket = await dataStore.getTicketById(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    let finishedGameId = null;
    let itemFinished = false;

    const updatedItems = (ticket.items || []).map(item => {
      if (!item_id || item.item_id === item_id) {
        if (item.queue_status === 'playing') {
          itemFinished = true;
          finishedGameId = item.game_id;
          return {
            ...item,
            queue_status: 'completed',
            completed_at: new Date().toISOString()
          };
        }
      }
      return item;
    });

    if (!itemFinished) {
      return res.status(400).json({ error: 'No active playing session found to end' });
    }

    // Determine overall ticket queue status
    const allCompleted = updatedItems.every(i => i.queue_status === 'completed');
    const hasPlaying = updatedItems.some(i => i.queue_status === 'playing');
    const overallStatus = allCompleted ? 'completed' : hasPlaying ? 'playing' : 'waiting';

    const updatedTicket = await dataStore.updateTicket(ticket_id, {
      items: updatedItems,
      queue_status: overallStatus
    });

    // Auto-promote next waiting customer for this game station
    let nextPromotedTicket = null;
    if (auto_promote && finishedGameId) {
      const allTickets = await dataStore.getTickets();
      // Find oldest ticket with this game in 'waiting' status
      const eligible = [];
      allTickets.forEach(t => {
        (t.items || []).forEach(it => {
          if (it.game_id === finishedGameId && it.queue_status === 'waiting') {
            eligible.push({ ticket: t, item: it });
          }
        });
      });

      // Sort by ticket creation time
      eligible.sort((a, b) => new Date(a.ticket.created_at) - new Date(b.ticket.created_at));

      if (eligible.length > 0) {
        const nextInLine = eligible[0];
        const nextUpdatedItems = (nextInLine.ticket.items || []).map(it => {
          if (it.item_id === nextInLine.item.item_id) {
            return {
              ...it,
              queue_status: 'playing',
              started_at: new Date().toISOString()
            };
          }
          return it;
        });

        nextPromotedTicket = await dataStore.updateTicket(nextInLine.ticket.ticket_id, {
          items: nextUpdatedItems,
          queue_status: 'playing'
        });
      }
    }

    res.json({
      message: 'Session ended successfully',
      ended_ticket: updatedTicket,
      next_promoted: nextPromotedTicket
    });
  } catch (err) {
    console.error('Error ending session:', err);
    res.status(500).json({ error: 'Failed to end queue session' });
  }
});

module.exports = router;
