const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'store.json');

// In-memory mutex to serialize ticket creation and prevent ID race conditions
let ticketWriteLock = Promise.resolve();

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      const examplePath = path.join(__dirname, 'store.example.json');
      if (fs.existsSync(examplePath)) {
        try {
          fs.copyFileSync(examplePath, STORE_PATH);
        } catch (e) {
          // ignore copy error
        }
      } else {
        return { games: [], discounts: [], tickets: [], users: [], settings: {} };
      }
    }
    let data = fs.readFileSync(STORE_PATH, 'utf8');
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading store.json:', err);
    return { games: [], discounts: [], tickets: [], users: [], settings: {} };
  }
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing store.json:', err);
    throw err;
  }
}

const jsonAdapter = {
  name: 'JSON File Store',

  // Games
  async getGames() {
    const store = readStore();
    return store.games || [];
  },

  async getGameById(gameId) {
    const games = await this.getGames();
    return games.find(g => g.game_id === gameId);
  },

  async createGame(gameData) {
    const store = readStore();
    const newGame = {
      game_id: gameData.game_id || `game_${Date.now()}`,
      name: gameData.name,
      price_per_person: Number(gameData.price_per_person) || 0,
      active: gameData.active !== undefined ? Boolean(gameData.active) : true,
      station_count: Number(gameData.station_count) || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.games.push(newGame);
    writeStore(store);
    return newGame;
  },

  async updateGame(gameId, updates) {
    const store = readStore();
    const index = store.games.findIndex(g => g.game_id === gameId);
    if (index === -1) return null;

    store.games[index] = {
      ...store.games[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    writeStore(store);
    return store.games[index];
  },

  // Discounts
  async getDiscounts() {
    const store = readStore();
    return store.discounts || [];
  },

  async createDiscount(discData) {
    const store = readStore();
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
    store.discounts.push(newDisc);
    writeStore(store);
    return newDisc;
  },

  async updateDiscount(discId, updates) {
    const store = readStore();
    const index = store.discounts.findIndex(d => d.discount_id === discId);
    if (index === -1) return null;

    store.discounts[index] = {
      ...store.discounts[index],
      ...updates
    };
    writeStore(store);
    return store.discounts[index];
  },

  // Tickets
  async getTickets(filters = {}) {
    const store = readStore();
    let tickets = store.tickets || [];

    if (filters.customer_name) {
      tickets = tickets.filter(t => t.customer_name.toLowerCase().includes(filters.customer_name.toLowerCase()));
    }
    if (filters.customer_phone) {
      tickets = tickets.filter(t => t.customer_phone.includes(filters.customer_phone));
    }
    if (filters.date) {
      tickets = tickets.filter(t => {
        if (!t.created_at) return false;
        const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t.created_at));
        return istDate === filters.date || t.created_at.startsWith(filters.date);
      });
    }
    if (filters.ticket_id) {
      tickets = tickets.filter(t => t.ticket_id.toLowerCase().includes(filters.ticket_id.toLowerCase()));
    }

    return tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getTicketById(ticketId) {
    const store = readStore();
    return (store.tickets || []).find(t => t.ticket_id === ticketId);
  },

  createTicket(ticketData) {
    return new Promise((resolve, reject) => {
      ticketWriteLock = ticketWriteLock.then(async () => {
        try {
          const store = readStore();
          const tickets = store.tickets || [];
          
          let nextNum = 1001;
          if (tickets.length > 0) {
            const nums = tickets
              .map(t => {
                const match = t.ticket_id && t.ticket_id.match(/TKT-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
              })
              .filter(n => !isNaN(n));
            if (nums.length > 0) {
              nextNum = Math.max(...nums) + 1;
            }
          }
          const ticket_id = ticketData.ticket_id || `TKT-${nextNum}`;

          const newTicket = {
            ticket_id,
            customer_name: ticketData.customer_name || 'Walk-in Guest',
            customer_phone: ticketData.customer_phone || '',
            customer_email: ticketData.customer_email || '',
            customer_age: ticketData.customer_age || null,
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

          store.tickets.push(newTicket);
          writeStore(store);
          resolve(newTicket);
        } catch (err) {
          reject(err);
        }
      });
    });
  },

  async updateTicket(ticketId, updates) {
    const store = readStore();
    const index = store.tickets.findIndex(t => t.ticket_id === ticketId);
    if (index === -1) return null;

    store.tickets[index] = {
      ...store.tickets[index],
      ...updates
    };
    writeStore(store);
    return store.tickets[index];
  },

  async deleteTicket(ticketId) {
    const store = readStore();
    const index = store.tickets.findIndex(t => t.ticket_id === ticketId);
    if (index === -1) return false;

    store.tickets.splice(index, 1);
    writeStore(store);
    return true;
  },

  // Users
  async getUsers() {
    const store = readStore();
    return store.users || [];
  },

  async findUser(username) {
    const users = await this.getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  async createUser(userData) {
    const store = readStore();
    const newUser = {
      user_id: userData.user_id || `usr_${Date.now()}`,
      username: userData.username,
      password_hash: userData.password_hash,
      role: userData.role || 'billing',
      name: userData.name || userData.username
    };
    store.users.push(newUser);
    writeStore(store);
    return newUser;
  },

  async updateUser(userId, updates) {
    const store = readStore();
    const index = (store.users || []).findIndex(u => u.user_id === userId);
    if (index === -1) return null;

    store.users[index] = {
      ...store.users[index],
      ...updates
    };
    writeStore(store);
    return store.users[index];
  },

  async deleteUser(userId) {
    const store = readStore();
    const index = (store.users || []).findIndex(u => u.user_id === userId);
    if (index === -1) return false;

    store.users.splice(index, 1);
    writeStore(store);
    return true;
  },

  // Settings
  async getSettings() {
    const store = readStore();
    return store.settings || {};
  },

  async updateSettings(updates) {
    const store = readStore();
    store.settings = {
      ...store.settings,
      ...updates
    };
    writeStore(store);
    return store.settings;
  }
};

module.exports = jsonAdapter;
