const express = require('express');
const router = express.Router();
const dataStore = require('../data/dataStore');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { syncTicketToGoogleSheet, retryPendingSheetSync, formatISTDate, formatISTTime } = require('../data/sheetsWebhook');

// GET /api/tickets - Authenticated (Billing staff and Admin can view)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { customer_name, customer_phone, date, ticket_id } = req.query;
    const tickets = await dataStore.getTickets({
      customer_name,
      customer_phone,
      date,
      ticket_id
    });
    res.json(tickets);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/tickets/:id - Authenticated
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await dataStore.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (err) {
    console.error('Error fetching ticket:', err);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Helper to calculate and build a ticket object
function processTicketPayload(body, username) {
  const {
    customer_name,
    customer_phone,
    customer_email,
    customer_age,
    items,
    discount_applied,
    payment_mode,
    created_at,
    ticket_id
  } = body;

  let subtotal = 0;
  const processedItems = (items || []).map(item => {
    const persons = Math.max(1, Number(item.no_of_persons) || 1);
    const price = Number(item.price_at_booking) || 0;
    const lineSubtotal = persons * price;
    subtotal += lineSubtotal;
    return {
      game_id: item.game_id,
      game_name: item.game_name,
      no_of_persons: persons,
      price_at_booking: price,
      subtotal: lineSubtotal,
      station_number: item.station_number || 1,
      queue_status: 'waiting'
    };
  });

  let discountDeduction = 0;
  if (discount_applied && discount_applied.value) {
    const appliesToAll = !discount_applied.applies_to || discount_applied.applies_to === 'all';
    if (appliesToAll) {
      if (discount_applied.type === 'percentage') {
        discountDeduction = Math.round((subtotal * discount_applied.value) / 100);
      } else {
        discountDeduction = Math.min(subtotal, Number(discount_applied.value) || 0);
      }
    } else {
      // Discount applies to a specific game only
      const targetItem = processedItems.find(item => item.game_id === discount_applied.applies_to);
      if (targetItem) {
        if (discount_applied.type === 'percentage') {
          discountDeduction = Math.round((targetItem.subtotal * discount_applied.value) / 100);
        } else {
          discountDeduction = Math.min(targetItem.subtotal, Number(discount_applied.value) || 0);
        }
      }
    }
  }

  const total_amount = Math.max(0, subtotal - discountDeduction);
  const nowIso = created_at || new Date().toISOString();

  return {
    ticket_id,
    customer_name: customer_name || 'Walk-in Guest',
    customer_phone: customer_phone || '',
    customer_email: customer_email || '',
    customer_age: customer_age || null,
    items: processedItems,
    discount_applied: discount_applied ? {
      discount_id: discount_applied.discount_id,
      name: discount_applied.name,
      type: discount_applied.type,
      value: discount_applied.value,
      applies_to: discount_applied.applies_to || 'all',
      amount_deducted: discountDeduction
    } : null,
    subtotal,
    total_amount,
    payment_status: 'paid',
    payment_mode: (payment_mode === 'upi' || payment_mode === 'qr') ? 'upi' : 'cash',
    marked_paid_by: username || 'staff',
    created_at: nowIso,
    date_ist: formatISTDate(nowIso),
    time_ist: formatISTTime(nowIso),
    queue_status: 'waiting',
    synced_to_sheet: false
  };
}

// POST /api/tickets - Authenticated (Billing staff or Admin can create bookings)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one game item is required to book a ticket' });
    }

    const ticketData = processTicketPayload(req.body, req.user.username);
    const createdTicket = await dataStore.createTicket(ticketData);

    // Asynchronously trigger Google Sheet Webhook Sync
    dataStore.getSettings().then(settings => {
      const webhookUrl = settings?.google_sheet_webhook_url || process.env.GOOGLE_SHEET_WEBHOOK_URL;
      if (webhookUrl) {
        syncTicketToGoogleSheet(createdTicket, webhookUrl)
          .then(() => dataStore.markTicketSynced(createdTicket.ticket_id))
          .catch(e => {
            console.warn('[SheetsWebhook] Async sync error, will retry later:', e.message);
          });
      }
    }).catch(() => {});

    res.status(201).json(createdTicket);
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// POST /api/tickets/sync-pending-sheets - Manually trigger retry for all pending tickets
router.post('/sync-pending-sheets', authenticateToken, async (req, res) => {
  try {
    const result = await retryPendingSheetSync();
    res.json({
      message: result.synced_count > 0
        ? `Successfully synced ${result.synced_count} pending ticket(s)`
        : (result.pending_remaining === 0 ? 'All tickets are already synced' : 'Could not sync tickets — check internet connection or webhook URL'),
      ...result
    });
  } catch (err) {
    console.error('Error running manual sheet sync:', err);
    res.status(500).json({ error: 'Failed to trigger sheet sync' });
  }
});

// POST /api/tickets/sync-offline - Sync batch of tickets generated offline
router.post('/sync-offline', authenticateToken, async (req, res) => {
  try {
    const { offline_tickets } = req.body;
    if (!offline_tickets || !Array.isArray(offline_tickets) || offline_tickets.length === 0) {
      return res.status(400).json({ error: 'No offline tickets provided to sync' });
    }

    const settings = await dataStore.getSettings();
    const webhookUrl = settings?.google_sheet_webhook_url || process.env.GOOGLE_SHEET_WEBHOOK_URL;

    const syncedResults = [];
    for (const raw of offline_tickets) {
      // Check if ticket already exists by ticket_id or offline_id
      const existing = raw.ticket_id ? await dataStore.getTicketById(raw.ticket_id) : null;
      if (!existing) {
        const ticketData = processTicketPayload(raw, raw.marked_paid_by || req.user.username);
        const created = await dataStore.createTicket(ticketData);
        syncedResults.push(created);

        // Sync to Google Sheet
        if (webhookUrl) {
          syncTicketToGoogleSheet(created, webhookUrl)
            .then(() => dataStore.markTicketSynced(created.ticket_id))
            .catch(e => {
              console.warn('[SheetsWebhook] Offline sync item error, will retry later:', e.message);
            });
        }
      } else {
        syncedResults.push(existing);
      }
    }

    res.json({
      message: `Successfully synced ${syncedResults.length} offline tickets`,
      synced_count: syncedResults.length,
      tickets: syncedResults
    });
  } catch (err) {
    console.error('Error syncing offline tickets:', err);
    res.status(500).json({ error: 'Failed to sync offline tickets' });
  }
});

// PUT /api/tickets/:id - Admin only (Edit ticket details)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_name,
      customer_phone,
      customer_email,
      customer_age,
      payment_mode,
      payment_status,
      queue_status
    } = req.body;

    const updates = {};
    if (customer_name !== undefined) updates.customer_name = customer_name;
    if (customer_phone !== undefined) updates.customer_phone = customer_phone;
    if (customer_email !== undefined) updates.customer_email = customer_email;
    if (customer_age !== undefined) updates.customer_age = customer_age;
    if (payment_mode !== undefined) updates.payment_mode = (payment_mode === 'upi' || payment_mode === 'qr') ? 'upi' : 'cash';
    if (payment_status !== undefined) updates.payment_status = payment_status;
    if (queue_status !== undefined) updates.queue_status = queue_status;

    const updated = await dataStore.updateTicket(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// DELETE /api/tickets/:id - Admin only
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dataStore.deleteTicket(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully', ticket_id: id });
  } catch (err) {
    console.error('Error deleting ticket:', err);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

module.exports = router;
