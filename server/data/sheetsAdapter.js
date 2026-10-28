const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('../config/default');

class SheetsAdapter {
  constructor() {
    this.name = 'Google Sheets API';
    this.sheets = null;
    this.spreadsheetId = config.GOOGLE_SHEET_ID;
    this.keyPath = config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return true;
    if (!this.spreadsheetId || !this.keyPath) {
      throw new Error('Google Sheets ID or Service Account Key path not configured');
    }

    const resolvedKeyPath = path.isAbsolute(this.keyPath)
      ? this.keyPath
      : path.join(__dirname, '..', this.keyPath);

    if (!fs.existsSync(resolvedKeyPath)) {
      throw new Error(`Google Service Account Key file not found at: ${resolvedKeyPath}`);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: resolvedKeyPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    this.sheets = google.sheets({ version: 'v4', auth: authClient });

    await this.ensureSheetTabs();
    this.initialized = true;
    console.log('[SheetsAdapter] Connected to Google Sheets successfully. ID:', this.spreadsheetId);
    return true;
  }

  async ensureSheetTabs() {
    const res = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId
    });
    const existingTitles = res.data.sheets.map(s => s.properties.title);
    const requiredSheets = ['Games', 'Discounts', 'Tickets', 'Users', 'Settings'];
    const requests = [];

    for (const title of requiredSheets) {
      if (!existingTitles.includes(title)) {
        requests.push({
          addSheet: {
            properties: { title }
          }
        });
      }
    }

    if (requests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });
      // Set default headers
      await this.writeHeader('Games!A1:G1', ['game_id', 'name', 'price_per_person', 'active', 'station_count', 'created_at', 'updated_at']);
      await this.writeHeader('Discounts!A1:H1', ['discount_id', 'name', 'type', 'value', 'active', 'applies_to', 'start_date', 'end_date']);
      await this.writeHeader('Tickets!A1:N1', ['ticket_id', 'customer_name', 'customer_phone', 'customer_email', 'customer_age', 'items_json', 'discount_json', 'subtotal', 'total_amount', 'payment_status', 'payment_mode', 'marked_paid_by', 'created_at', 'queue_status']);
      await this.writeHeader('Users!A1:E1', ['user_id', 'username', 'password_hash', 'role', 'name']);
      await this.writeHeader('Settings!A1:B1', ['key', 'value']);
    }
  }

  async writeHeader(range, headers) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] }
    });
  }

  // Games
  async getGames() {
    await this.init();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Games!A2:G'
    });
    const rows = res.data.values || [];
    return rows.map(r => ({
      game_id: r[0],
      name: r[1],
      price_per_person: Number(r[2]) || 0,
      active: r[3] === 'true' || r[3] === true || r[3] === 'TRUE',
      station_count: Number(r[4]) || 1,
      created_at: r[5] || '',
      updated_at: r[6] || ''
    }));
  }

  async createGame(gameData) {
    await this.init();
    const newGame = {
      game_id: gameData.game_id || `game_${Date.now()}`,
      name: gameData.name,
      price_per_person: Number(gameData.price_per_person) || 0,
      active: gameData.active !== undefined ? Boolean(gameData.active) : true,
      station_count: Number(gameData.station_count) || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Games!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          newGame.game_id,
          newGame.name,
          newGame.price_per_person,
          newGame.active,
          newGame.station_count,
          newGame.created_at,
          newGame.updated_at
        ]]
      }
    });
    return newGame;
  }

  async updateGame(gameId, updates) {
    await this.init();
    const games = await this.getGames();
    const idx = games.findIndex(g => g.game_id === gameId);
    if (idx === -1) return null;

    const updated = { ...games[idx], ...updates, updated_at: new Date().toISOString() };
    const rowNum = idx + 2;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `Games!A${rowNum}:G${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          updated.game_id,
          updated.name,
          updated.price_per_person,
          updated.active,
          updated.station_count,
          updated.created_at,
          updated.updated_at
        ]]
      }
    });
    return updated;
  }

  // Discounts
  async getDiscounts() {
    await this.init();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Discounts!A2:L'
    });
    const rows = res.data.values || [];
    return rows.map(r => ({
      discount_id: r[0],
      name: r[1],
      type: r[2],
      value: Number(r[3]) || 0,
      active: r[4] === 'true' || r[4] === true || r[4] === 'TRUE',
      applies_to: r[5] || 'all',
      start_date: r[6] || '',
      end_date: r[7] || '',
      start_time: r[8] || '',
      end_time: r[9] || '',
      days_of_week: r[10] ? r[10].split(',').map(s => s.trim().toLowerCase()) : [],
      auto_apply: r[11] === 'true' || r[11] === true || r[11] === 'TRUE'
    }));
  }

  async createDiscount(discData) {
    await this.init();
    const newDisc = {
      discount_id: discData.discount_id || `disc_${Date.now()}`,
      name: discData.name,
      type: discData.type === 'percentage' ? 'percentage' : 'flat',
      value: Number(discData.value) || 0,
      active: discData.active !== undefined ? Boolean(discData.active) : true,
      applies_to: discData.applies_to || 'all',
      start_date: discData.start_date || '',
      end_date: discData.end_date || '',
      start_time: discData.start_time || '',
      end_time: discData.end_time || '',
      days_of_week: Array.isArray(discData.days_of_week) ? discData.days_of_week : [],
      auto_apply: Boolean(discData.auto_apply)
    };
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Discounts!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          newDisc.discount_id,
          newDisc.name,
          newDisc.type,
          newDisc.value,
          newDisc.active,
          newDisc.applies_to,
          newDisc.start_date,
          newDisc.end_date,
          newDisc.start_time,
          newDisc.end_time,
          newDisc.days_of_week.join(','),
          newDisc.auto_apply
        ]]
      }
    });
    return newDisc;
  }

  async updateDiscount(discId, updates) {
    await this.init();
    const discounts = await this.getDiscounts();
    const idx = discounts.findIndex(d => d.discount_id === discId);
    if (idx === -1) return null;

    const updated = { ...discounts[idx], ...updates };
    const rowNum = idx + 2;
    const daysStr = Array.isArray(updated.days_of_week) ? updated.days_of_week.join(',') : (updated.days_of_week || '');
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `Discounts!A${rowNum}:L${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          updated.discount_id,
          updated.name,
          updated.type,
          updated.value,
          updated.active,
          updated.applies_to,
          updated.start_date,
          updated.end_date,
          updated.start_time || '',
          updated.end_time || '',
          daysStr,
          Boolean(updated.auto_apply)
        ]]
      }
    });
    return updated;
  }

  // Tickets
  async getTickets(filters = {}) {
    await this.init();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Tickets!A2:N'
    });
    const rows = res.data.values || [];
    let tickets = rows.map(r => {
      let items = [];
      let discount = null;
      try { items = JSON.parse(r[5] || '[]'); } catch (e) {}
      try { discount = r[6] ? JSON.parse(r[6]) : null; } catch (e) {}

      return {
        ticket_id: r[0],
        customer_name: r[1],
        customer_phone: r[2],
        customer_email: r[3],
        customer_age: r[4] ? Number(r[4]) : null,
        items,
        discount_applied: discount,
        subtotal: Number(r[7]) || 0,
        total_amount: Number(r[8]) || 0,
        payment_status: r[9],
        payment_mode: r[10],
        marked_paid_by: r[11],
        created_at: r[12],
        queue_status: r[13] || 'waiting'
      };
    });

    if (filters.customer_name) {
      tickets = tickets.filter(t => t.customer_name.toLowerCase().includes(filters.customer_name.toLowerCase()));
    }
    if (filters.customer_phone) {
      tickets = tickets.filter(t => t.customer_phone.includes(filters.customer_phone));
    }
    if (filters.date) {
      tickets = tickets.filter(t => t.created_at && t.created_at.startsWith(filters.date));
    }
    if (filters.ticket_id) {
      tickets = tickets.filter(t => t.ticket_id.toLowerCase().includes(filters.ticket_id.toLowerCase()));
    }

    return tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async createTicket(ticketData) {
    await this.init();
    const tickets = await this.getTickets();
    let nextNum = 1001;
    if (tickets.length > 0) {
      const nums = tickets
        .map(t => {
          const m = t.ticket_id && t.ticket_id.match(/TKT-(\d+)/);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(n => !isNaN(n));
      if (nums.length > 0) nextNum = Math.max(...nums) + 1;
    }
    const ticket_id = ticketData.ticket_id || `TKT-${nextNum}`;

    const newTicket = {
      ticket_id,
      customer_name: ticketData.customer_name || 'Walk-in Guest',
      customer_phone: ticketData.customer_phone || '',
      customer_email: ticketData.customer_email || '',
      customer_age: ticketData.customer_age || '',
      items: (ticketData.items || []).map((item, idx) => ({
        item_id: `${ticket_id}_item_${idx + 1}`,
        game_id: item.game_id,
        game_name: item.game_name,
        no_of_persons: Number(item.no_of_persons) || 1,
        price_at_booking: Number(item.price_at_booking) || 0,
        subtotal: Number(item.subtotal) || 0,
        station_number: item.station_number || 1,
        queue_status: item.queue_status || 'waiting',
        started_at: null,
        completed_at: null
      })),
      discount_applied: ticketData.discount_applied || null,
      subtotal: Number(ticketData.subtotal) || 0,
      total_amount: Number(ticketData.total_amount) || 0,
      payment_status: ticketData.payment_status || 'paid',
      payment_mode: ticketData.payment_mode || 'cash',
      marked_paid_by: ticketData.marked_paid_by || 'staff',
      created_at: ticketData.created_at || new Date().toISOString(),
      queue_status: ticketData.queue_status || 'waiting',
      synced_to_sheet: ticketData.synced_to_sheet !== undefined ? Boolean(ticketData.synced_to_sheet) : false
    };

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Tickets!A:N',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          newTicket.ticket_id,
          newTicket.customer_name,
          newTicket.customer_phone,
          newTicket.customer_email,
          newTicket.customer_age,
          JSON.stringify(newTicket.items),
          JSON.stringify(newTicket.discount_applied),
          newTicket.subtotal,
          newTicket.total_amount,
          newTicket.payment_status,
          newTicket.payment_mode,
          newTicket.marked_paid_by,
          newTicket.created_at,
          newTicket.queue_status
        ]]
      }
    });

    return newTicket;
  }

  async updateTicket(ticketId, updates) {
    await this.init();
    const tickets = await this.getTickets();
    const idx = tickets.findIndex(t => t.ticket_id === ticketId);
    if (idx === -1) return null;

    const updated = { ...tickets[idx], ...updates };
    const rowNum = idx + 2;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `Tickets!A${rowNum}:N${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          updated.ticket_id,
          updated.customer_name,
          updated.customer_phone,
          updated.customer_email,
          updated.customer_age,
          JSON.stringify(updated.items),
          JSON.stringify(updated.discount_applied),
          updated.subtotal,
          updated.total_amount,
          updated.payment_status,
          updated.payment_mode,
          updated.marked_paid_by,
          updated.created_at,
          updated.queue_status
        ]]
      }
    });
    return updated;
  }

  async deleteTicket(ticketId) {
    await this.init();
    const tickets = await this.getTickets();
    const idx = tickets.findIndex(t => t.ticket_id === ticketId);
    if (idx === -1) return false;

    // In Google Sheets, clear the row
    const rowNum = idx + 2;
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `Tickets!A${rowNum}:N${rowNum}`
    });
    return true;
  }

  // Users
  async getUsers() {
    await this.init();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Users!A2:E'
    });
    const rows = res.data.values || [];
    return rows.map(r => ({
      user_id: r[0],
      username: r[1],
      password_hash: r[2],
      role: r[3],
      name: r[4]
    }));
  }

  async findUser(username) {
    const users = await this.getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  async createUser(userData) {
    await this.init();
    const newUser = {
      user_id: userData.user_id || `usr_${Date.now()}`,
      username: userData.username,
      password_hash: userData.password_hash,
      role: userData.role || 'billing',
      name: userData.name || userData.username
    };
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Users!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          newUser.user_id,
          newUser.username,
          newUser.password_hash,
          newUser.role,
          newUser.name
        ]]
      }
    });
    return newUser;
  }

  // Settings
  async getSettings() {
    await this.init();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Settings!A2:B'
    });
    const rows = res.data.values || [];
    const settings = {};
    rows.forEach(r => {
      if (r[0]) settings[r[0]] = r[1];
    });
    return settings;
  }

  async updateSettings(updates) {
    await this.init();
    const current = await this.getSettings();
    const merged = { ...current, ...updates };

    const rows = Object.entries(merged).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Settings!A2:B' + (rows.length + 1),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    });
    return merged;
  }
}

module.exports = new SheetsAdapter();
