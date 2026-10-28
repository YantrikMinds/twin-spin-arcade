const https = require('https');
const http = require('http');
const { URL } = require('url');

function formatISTDate(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

function formatISTTime(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(d);
}

function followGetRedirect(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many redirects while following Google Sheet Webhook echo'));
    }

    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    client.get(targetUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(followGetRedirect(res.headers.location, maxRedirects - 1));
      }

      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body
        });
      });
    }).on('error', reject);
  });
}

/**
 * Post JSON payload with redirect following (Google Apps Script redirects via 302 to echo endpoint)
 */
function postWithRedirects(targetUrl, postData, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many redirects while calling Google Sheet Webhook'));
    }

    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const dataString = typeof postData === 'string' ? postData : JSON.stringify(postData);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = client.request(options, (res) => {
      // Google Apps Script redirects after receiving doPost to serve output via GET
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(followGetRedirect(res.headers.location, maxRedirects - 1));
      }

      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body
        });
      });
    });

    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

/**
 * Pushes ticket data to Google Apps Script Webhook
 */
async function syncTicketToGoogleSheet(ticket, webhookUrl) {
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
    return { skipped: true, reason: 'No Google Sheet Webhook URL configured' };
  }

  const gamesSummary = (ticket.items || []).map(i => `${i.game_name} (x${i.no_of_persons} @ ₹${i.price_at_booking})`).join(', ');

  const payload = {
    action: 'add_ticket',
    date_ist: formatISTDate(ticket.created_at),
    time_ist: formatISTTime(ticket.created_at),
    ticket_id: ticket.ticket_id,
    customer_name: ticket.customer_name || 'Walk-in Guest',
    customer_phone: ticket.customer_phone || '-',
    customer_email: ticket.customer_email || '-',
    games_summary: gamesSummary,
    subtotal: ticket.subtotal || 0,
    discount_name: ticket.discount_applied?.name || 'None',
    discount_amount: ticket.discount_applied?.amount_deducted || 0,
    total_amount: ticket.total_amount || 0,
    payment_mode: (ticket.payment_mode || 'cash').toUpperCase(),
    cashier: ticket.marked_paid_by || 'staff'
  };

  try {
    const res = await postWithRedirects(webhookUrl, payload);
    if (res.statusCode >= 200 && res.statusCode < 400) {
      console.log(`[GoogleSheetSync] Ticket ${ticket.ticket_id} synced. Status: ${res.statusCode}`);
      return { success: true, statusCode: res.statusCode };
    }
    throw new Error(`Google Sheet Webhook returned HTTP ${res.statusCode}`);
  } catch (err) {
    console.warn(`[GoogleSheetSync] Error syncing ticket ${ticket.ticket_id}:`, err.message);
    throw err;
  }
}

/**
 * Send a test ping row to verify Google Sheet Webhook connection
 */
async function testGoogleSheetWebhook(webhookUrl) {
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
    throw new Error('Please provide a valid Google Apps Script Webhook URL');
  }

  const now = new Date().toISOString();
  const testPayload = {
    action: 'test_connection',
    date_ist: formatISTDate(now),
    time_ist: formatISTTime(now),
    ticket_id: 'TEST-PING',
    customer_name: 'Twin Spin System Test',
    customer_phone: '9999999999',
    customer_email: 'test@twinspin.com',
    games_summary: 'Connection Test Entry (Verified)',
    subtotal: 100,
    discount_name: 'None',
    discount_amount: 0,
    total_amount: 100,
    payment_mode: 'UPI',
    cashier: 'admin'
  };

  const res = await postWithRedirects(webhookUrl, testPayload);
  return {
    success: true,
    statusCode: res.statusCode,
    response: res.body
  };
}

let isSyncing = false;

/**
 * Retries syncing any paid tickets that have not yet reached Google Sheets.
 * Runs on a timer and can also be triggered on startup or manually by admin.
 */
async function retryPendingSheetSync() {
  if (isSyncing) return { in_progress: true };
  isSyncing = true;

  try {
    const dataStore = require('./dataStore');
    const settings = await dataStore.getSettings();
    const webhookUrl = settings?.google_sheet_webhook_url || process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (!webhookUrl) {
      return { skipped: true, reason: 'No Google Sheet Webhook URL configured' };
    }

    const allTickets = await dataStore.getTickets();
    const pendingTickets = allTickets.filter(
      t => t.payment_status === 'paid' && !t.synced_to_sheet
    );

    if (pendingTickets.length === 0) {
      return { synced_count: 0, pending_remaining: 0 };
    }

    let syncedCount = 0;
    // Process older tickets first so they appear chronologically in Google Sheet
    const toSync = [...pendingTickets].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    for (const ticket of toSync) {
      try {
        await syncTicketToGoogleSheet(ticket, webhookUrl);
        await dataStore.markTicketSynced(ticket.ticket_id);
        syncedCount++;
      } catch (err) {
        console.warn(`[SheetsRetry] Could not sync ${ticket.ticket_id} (offline/unreachable):`, err.message);
        break; // Stop this cycle if network is currently down
      }
    }

    if (syncedCount > 0) {
      console.log(`[SheetsRetry] Synced ${syncedCount} pending ticket(s) to Google Sheet.`);
    }

    const remaining = pendingTickets.length - syncedCount;
    return { synced_count: syncedCount, pending_remaining: remaining };
  } catch (err) {
    console.error('[SheetsRetry] Error during retry run:', err.message);
    return { error: err.message };
  } finally {
    isSyncing = false;
  }
}

async function getPendingSyncCount() {
  try {
    const dataStore = require('./dataStore');
    const allTickets = await dataStore.getTickets();
    return allTickets.filter(t => t.payment_status === 'paid' && !t.synced_to_sheet).length;
  } catch {
    return 0;
  }
}

module.exports = {
  syncTicketToGoogleSheet,
  testGoogleSheetWebhook,
  retryPendingSheetSync,
  getPendingSyncCount,
  formatISTDate,
  formatISTTime
};

