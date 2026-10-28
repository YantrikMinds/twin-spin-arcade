const config = require('../config/default');
const jsonAdapter = require('./jsonAdapter');
const sheetsAdapter = require('./sheetsAdapter');

let activeAdapter = jsonAdapter;

if (config.GOOGLE_SHEET_ID && config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
  console.log('[DataStore] Google Sheets configuration detected. Attempting to use Google Sheets API...');
  activeAdapter = sheetsAdapter;
} else {
  console.log('[DataStore] Google Sheets credentials not configured. Using local JSON store fallback (data/store.json).');
  activeAdapter = jsonAdapter;
}

async function withFallback(operation, ...args) {
  try {
    return await activeAdapter[operation](...args);
  } catch (err) {
    if (activeAdapter !== jsonAdapter) {
      console.warn(`[DataStore] Google Sheets operation '${operation}' failed:`, err.message);
      console.warn('[DataStore] Falling back to local JSON store.');
      activeAdapter = jsonAdapter;
      return await jsonAdapter[operation](...args);
    }
    throw err;
  }
}

const dataStore = {
  getAdapterName: () => activeAdapter.name,

  // Games
  getGames: (...args) => withFallback('getGames', ...args),
  getGameById: (...args) => withFallback('getGameById', ...args),
  createGame: (...args) => withFallback('createGame', ...args),
  updateGame: (...args) => withFallback('updateGame', ...args),

  // Discounts
  getDiscounts: (...args) => withFallback('getDiscounts', ...args),
  createDiscount: (...args) => withFallback('createDiscount', ...args),
  updateDiscount: (...args) => withFallback('updateDiscount', ...args),

  // Tickets
  getTickets: (...args) => withFallback('getTickets', ...args),
  getTicketById: (...args) => withFallback('getTicketById', ...args),
  createTicket: (...args) => withFallback('createTicket', ...args),
  updateTicket: (...args) => withFallback('updateTicket', ...args),
  markTicketSynced: (ticketId) => withFallback('updateTicket', ticketId, { synced_to_sheet: true }),
  deleteTicket: (...args) => withFallback('deleteTicket', ...args),

  // Users
  getUsers: (...args) => withFallback('getUsers', ...args),
  findUser: (...args) => withFallback('findUser', ...args),
  createUser: (...args) => withFallback('createUser', ...args),
  updateUser: (...args) => withFallback('updateUser', ...args),
  deleteUser: (...args) => withFallback('deleteUser', ...args),

  // Settings
  getSettings: (...args) => withFallback('getSettings', ...args),
  updateSettings: (...args) => withFallback('updateSettings', ...args)
};

module.exports = dataStore;
