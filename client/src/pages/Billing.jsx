import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { formatINR } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import ReceiptPrint from '../components/ReceiptPrint';
import {
  Gamepad2,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle,
  Info,
  User,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  ArrowRight,
  Calculator,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  Sparkles,
  Clock,
  Zap,
  X
} from 'lucide-react';

export default function Billing() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [games, setGames] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Network and Offline sync states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('twin_spin_offline_tickets') || '[]');
    } catch {
      return [];
    }
  });
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [syncToast, setSyncToast] = useState('');
  const [rateChangeToast, setRateChangeToast] = useState('');

  // Refs for tracking changes across polling intervals
  const lastGamesJsonRef = useRef('');
  const lastDiscountsJsonRef = useRef('');
  const isInitialLoadRef = useRef(true);

  // Selected cart items: { [game_id]: { game, persons } }
  const [selectedGames, setSelectedGames] = useState({});
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [manuallyClearedDiscount, setManuallyClearedDiscount] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerName, setCustomerName] = useState('Walk-in Guest');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAge, setCustomerAge] = useState('');
  
  // Explicit Payment Mode selection: 'cash' or 'upi'
  const [paymentMode, setPaymentMode] = useState('upi');
  const [cashTendered, setCashTendered] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Completed ticket for receipt printing
  const [completedTicket, setCompletedTicket] = useState(null);

  // Load from local storage cache initially if present
  const loadFromCache = () => {
    try {
      const cachedGames = localStorage.getItem('twin_spin_games_cache');
      const cachedDiscounts = localStorage.getItem('twin_spin_discounts_cache');
      if (cachedGames) setGames(JSON.parse(cachedGames));
      if (cachedDiscounts) setDiscounts(JSON.parse(cachedDiscounts));
    } catch (e) {
      console.warn('Failed reading catalog cache:', e);
    }
  };

  // Sync queued offline tickets to the backend and Google Sheet
  const syncQueuedTickets = async (queueToSync = offlineQueue) => {
    if (queueToSync.length === 0 || syncingOffline) return;
    try {
      setSyncingOffline(true);
      const result = await api.syncOfflineTickets(queueToSync);
      localStorage.removeItem('twin_spin_offline_tickets');
      setOfflineQueue([]);
      setSyncToast(`Synchronized ${result.synced_count || queueToSync.length} offline tickets to Server and Google Sheet.`);
      setTimeout(() => setSyncToast(''), 6000);
    } catch (err) {
      console.warn('Offline sync failed, will retry on next connection:', err);
    } finally {
      setSyncingOffline(false);
    }
  };

  // Poll games and discounts
  const fetchCatalog = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [gamesData, discountsData] = await Promise.all([
        api.getGames(true),
        api.getDiscounts(true)
      ]);

      const newGamesJson = JSON.stringify(gamesData);
      const newDiscountsJson = JSON.stringify(discountsData);

      // Check if price or discount changed while cashier was on page
      if (!isInitialLoadRef.current && lastGamesJsonRef.current) {
        if (newGamesJson !== lastGamesJsonRef.current || newDiscountsJson !== lastDiscountsJsonRef.current) {
          setRateChangeToast('Notice: Admin updated pricing or discounts. Rates have been refreshed automatically.');
          setTimeout(() => setRateChangeToast(''), 8000);
        }
      }

      isInitialLoadRef.current = false;
      lastGamesJsonRef.current = newGamesJson;
      lastDiscountsJsonRef.current = newDiscountsJson;

      // Update state and cache in localStorage for offline resilience
      setGames(gamesData);
      setDiscounts(discountsData);
      localStorage.setItem('twin_spin_games_cache', newGamesJson);
      localStorage.setItem('twin_spin_discounts_cache', newDiscountsJson);
      setIsOnline(true);

      // Also if there were offline tickets pending, sync them
      const currentQueue = JSON.parse(localStorage.getItem('twin_spin_offline_tickets') || '[]');
      if (currentQueue.length > 0) {
        syncQueuedTickets(currentQueue);
      }
    } catch (err) {
      console.warn('Catalog fetch error:', err.message);
      setIsOnline(false);
      loadFromCache();
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load and background polling every 3.5 seconds
  useEffect(() => {
    loadFromCache();
    fetchCatalog(false);

    const pollInterval = setInterval(() => {
      fetchCatalog(true);
    }, 3500);

    const handleOnline = () => {
      setIsOnline(true);
      fetchCatalog(true);
      const currentQueue = JSON.parse(localStorage.getItem('twin_spin_offline_tickets') || '[]');
      if (currentQueue.length > 0) {
        syncQueuedTickets(currentQueue);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleAddPerson = (game) => {
    setSelectedGames(prev => {
      const current = prev[game.game_id];
      const newCount = current ? current.persons + 1 : 1;
      return {
        ...prev,
        [game.game_id]: {
          game,
          persons: newCount
        }
      };
    });
  };

  const handleRemovePerson = (gameId) => {
    setSelectedGames(prev => {
      const current = prev[gameId];
      if (!current) return prev;
      if (current.persons <= 1) {
        const copy = { ...prev };
        delete copy[gameId];
        return copy;
      }
      return {
        ...prev,
        [gameId]: {
          ...current,
          persons: current.persons - 1
        }
      };
    });
  };

  const handleClearSelection = () => {
    setSelectedGames({});
    setSelectedDiscountId('');
    setManuallyClearedDiscount(false);
  };

  // Computations
  const cartItems = Object.values(selectedGames);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.persons * item.game.price_per_person), 0);

  // Auto-apply scheduled discount if marked auto_apply and not manually cleared by cashier
  useEffect(() => {
    if (!selectedDiscountId && !manuallyClearedDiscount && discounts.length > 0 && cartItems.length > 0) {
      const autoDisc = discounts.find(d => d.auto_apply);
      if (autoDisc) {
        if (autoDisc.applies_to === 'all' || selectedGames[autoDisc.applies_to]) {
          setSelectedDiscountId(autoDisc.discount_id);
        }
      }
    }
  }, [discounts, cartItems.length, selectedDiscountId, manuallyClearedDiscount, selectedGames]);

  const activeDiscount = discounts.find(d => d.discount_id === selectedDiscountId);
  let discountDeduction = 0;
  if (activeDiscount) {
    if (activeDiscount.applies_to === 'all') {
      if (activeDiscount.type === 'percentage') {
        discountDeduction = Math.round((subtotal * activeDiscount.value) / 100);
      } else {
        discountDeduction = Math.min(subtotal, activeDiscount.value);
      }
    } else {
      const targetItem = selectedGames[activeDiscount.applies_to];
      if (targetItem) {
        const gameSubtotal = targetItem.persons * targetItem.game.price_per_person;
        if (activeDiscount.type === 'percentage') {
          discountDeduction = Math.round((gameSubtotal * activeDiscount.value) / 100);
        } else {
          discountDeduction = Math.min(gameSubtotal, activeDiscount.value);
        }
      }
    }
  }

  const grandTotal = Math.max(0, subtotal - discountDeduction);

  // Cash change return calculation
  const tenderedNum = Number(cashTendered) || 0;
  const changeToReturn = tenderedNum > grandTotal ? tenderedNum - grandTotal : 0;

  const getStationBadge = () => {
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  // Helper to handle offline ticket creation without blocking the cashier
  const handleCreateOfflineTicket = (payload) => {
    const offlineTicketId = `TK-OFF-${Date.now().toString(36).toUpperCase()}`;
    // Build items with subtotal so receipt can display them
    const itemsWithSubtotal = (payload.items || []).map(item => ({
      ...item,
      subtotal: item.no_of_persons * item.price_at_booking
    }));
    const offlineTicket = {
      ...payload,
      items: itemsWithSubtotal,
      ticket_id: offlineTicketId,
      subtotal,
      discount_applied: activeDiscount ? {
        discount_id: activeDiscount.discount_id,
        name: activeDiscount.name,
        type: activeDiscount.type,
        value: activeDiscount.value,
        applies_to: activeDiscount.applies_to || 'all',
        amount_deducted: discountDeduction
      } : null,
      total_amount: grandTotal,
      marked_paid_by: user?.username || 'counter_staff',
      payment_status: 'paid',
      created_at: new Date().toISOString(),
      is_offline: true
    };

    const newQueue = [...offlineQueue, offlineTicket];
    setOfflineQueue(newQueue);
    localStorage.setItem('twin_spin_offline_tickets', JSON.stringify(newQueue));

    setCompletedTicket(offlineTicket);
    setShowPaymentModal(false);
    handleClearSelection();
    setCustomerName('Walk-in Guest');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAge('');
    setCashTendered('');
    setPaymentMode('upi');
    setSyncToast(`Saved in Offline Mode. Ticket printed. (${newQueue.length} tickets queued to auto-sync)`);
  };

  const handleConfirmBooking = async () => {
    if (cartItems.length === 0) return;
    setErrorMsg('');
    setSubmitting(true);

    const payload = {
      customer_name: customerName.trim() || 'Walk-in Guest',
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim(),
      customer_age: customerAge ? Number(customerAge) : null,
      payment_mode: paymentMode, // 'cash' or 'upi'
      items: cartItems.map(item => ({
        game_id: item.game.game_id,
        game_name: item.game.name,
        no_of_persons: item.persons,
        price_at_booking: item.game.price_per_person
      })),
      discount_applied: activeDiscount ? {
        discount_id: activeDiscount.discount_id,
        name: activeDiscount.name,
        type: activeDiscount.type,
        value: activeDiscount.value,
        applies_to: activeDiscount.applies_to || 'all',
        amount_deducted: discountDeduction
      } : null
    };

    // If completely offline, store in offline queue immediately
    if (!navigator.onLine) {
      handleCreateOfflineTicket(payload);
      setSubmitting(false);
      return;
    }

    try {
      const createdTicket = await api.createTicket(payload);

      setCompletedTicket(createdTicket);
      setShowPaymentModal(false);
      handleClearSelection();
      setCustomerName('Walk-in Guest');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAge('');
      setCashTendered('');
      setPaymentMode('upi');
    } catch (err) {
      // If server unreachable or network error, fallback to offline booking seamlessly
      console.warn('Network booking error, saving offline:', err.message);
      handleCreateOfflineTicket(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Rate Change Real-Time Notification Banner */}
      {rateChangeToast && (
        <div className="mb-4 p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-cyan-400 shrink-0 animate-bounce" />
            <span className="font-semibold">{rateChangeToast}</span>
          </div>
          <button onClick={() => setRateChangeToast('')} className="text-cyan-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sync Success / Offline Toast */}
      {syncToast && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast('')} className="text-emerald-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Status Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 flex items-center">
            <Gamepad2 className="w-8 h-8 mr-3 text-cyan-400" />
            Counter Billing POS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Select games, set player count, choose Cash / UPI payment, and issue thermal entry tokens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live Status Badge */}
          {isOnline ? (
            <span className="flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
              Live Connected (Real-Time Sync)
            </span>
          ) : (
            <span className="flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <WifiOff className="w-3.5 h-3.5 mr-1.5" />
              Offline Mode ({offlineQueue.length} queued)
            </span>
          )}

          {/* Sync Button if offline tickets exist */}
          {offlineQueue.length > 0 && isOnline && (
            <button
              onClick={() => syncQueuedTickets()}
              disabled={syncingOffline}
              className="flex items-center text-xs font-bold px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
            >
              <RefreshCw className={`w-3 h-3 mr-1.5 ${syncingOffline ? 'animate-spin' : ''}`} />
              Sync ({offlineQueue.length}) Now
            </button>
          )}

          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
            Cashier: <strong className="text-slate-200">{user?.name || user?.username}</strong>
          </span>
        </div>
      </div>

      {/* Live Store Offer Alert Banner for Cashier */}
      {discounts.length > 0 && (
        <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-500/40 shadow-lg shadow-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  STORE OFFER ACTIVE RIGHT NOW:
                </span>
                {discounts.map(d => (
                  <span key={d.discount_id} className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200">
                    {d.name} ({d.type === 'percentage' ? `${d.value}% OFF` : `₹${d.value} FLAT OFF`})
                    {d.auto_apply && ' ⚡ Auto-Applied'}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                {discounts.some(d => d.auto_apply)
                  ? '⚡ Auto-Apply is active on this schedule — matching game discounts are being applied automatically!'
                  : 'Cashier alert: A scheduled store discount is currently live according to store hours.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3" />
          Loading arcade stations...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Visual Game Selector Grid (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {games.map(game => {
                const isSelected = !!selectedGames[game.game_id];
                const persons = selectedGames[game.game_id]?.persons || 0;

                return (
                  <div
                    key={game.game_id}
                    className={`relative rounded-xl p-5 border transition-all ${
                      isSelected
                        ? `bg-slate-900 shadow-lg border-blue-500 ring-1 ring-blue-500/40`
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2 bg-slate-800 text-slate-300 border border-slate-700">
                          Station
                        </span>
                        <h3 className="text-lg font-bold text-slate-100">{game.name}</h3>
                        {(() => {
                          const appliesToThis = activeDiscount &&
                            (activeDiscount.applies_to === 'all' || activeDiscount.applies_to === game.game_id);
                          if (appliesToThis && activeDiscount.type === 'percentage') {
                            const discountedPrice = Math.round(game.price_per_person * (1 - activeDiscount.value / 100));
                            return (
                              <div className="mt-1">
                                <p className="text-slate-500 line-through text-sm leading-tight">
                                  {formatINR(game.price_per_person)}<span className="text-xs font-normal"> / person</span>
                                </p>
                                <p className="text-emerald-400 font-extrabold text-base leading-tight">
                                  {formatINR(discountedPrice)} <span className="text-xs font-normal text-slate-400">/ person</span>
                                </p>
                                <span className="inline-block text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold mt-0.5">
                                  {activeDiscount.value}% OFF — {activeDiscount.name}
                                </span>
                              </div>
                            );
                          } else if (appliesToThis && activeDiscount.type === 'flat') {
                            return (
                              <div className="mt-1">
                                <p className="text-blue-400 font-extrabold text-base leading-tight">
                                  {formatINR(game.price_per_person)} <span className="text-xs font-normal text-slate-400">/ person</span>
                                </p>
                                <span className="inline-block text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold mt-0.5">
                                  ₹{activeDiscount.value} FLAT OFF — {activeDiscount.name}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <p className="text-blue-400 font-extrabold text-base mt-1">
                              {formatINR(game.price_per_person)} <span className="text-xs font-normal text-slate-400">/ person</span>
                            </p>
                          );
                        })()}
                      </div>

                      {/* Station Counter Stepper */}
                      <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleRemovePerson(game.game_id)}
                          disabled={!isSelected}
                          className="w-8 h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-900 flex items-center justify-center transition-all active:scale-90"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <span className="w-8 text-center font-bold text-base text-slate-100">
                          {persons}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleAddPerson(game)}
                          className="w-8 h-8 rounded-md bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all active:scale-90"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Subtotal:</span>
                        <span className="font-bold text-slate-200">
                          {persons} × {formatINR(game.price_per_person)} = <strong className="text-blue-400">{formatINR(persons * game.price_per_person)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Instructions Notice */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3.5 flex items-center space-x-3 text-xs text-slate-400">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Tip: Multiple games can be added into one ticket. Once booked, sessions automatically enter their respective queues.
              </span>
            </div>
          </div>

          {/* Right Column: Live Bill Summary Panel (4 cols on desktop) */}
          <div className="lg:col-span-4 sticky top-20">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h2 className="text-base font-bold text-slate-100 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-cyan-400" />
                  Live Bill Summary
                </h2>
                {cartItems.length > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="py-4 space-y-3 max-h-60 overflow-y-auto">
                {cartItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <p className="font-semibold text-slate-300 mb-1">No games selected</p>
                    <p>Click + on any game station to start billing</p>
                  </div>
                ) : (
                  cartItems.map(({ game, persons }) => (
                    <div key={game.game_id} className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-200">{game.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {persons} {persons > 1 ? 'persons' : 'person'} × {formatINR(game.price_per_person)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-100">
                        {formatINR(persons * game.price_per_person)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Discounts Selection */}
              {cartItems.length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Apply Offer / Discount
                  </label>
                  <select
                    value={selectedDiscountId}
                    onChange={(e) => {
                      setSelectedDiscountId(e.target.value);
                      if (!e.target.value) {
                        setManuallyClearedDiscount(true);
                      } else {
                        setManuallyClearedDiscount(false);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">No Discount</option>
                    {discounts.map(d => (
                      <option key={d.discount_id} value={d.discount_id}>
                        {d.name} ({d.type === 'percentage' ? `${d.value}% Off` : `₹${d.value} Flat Off`})
                        {d.start_time && d.end_time ? ` [⏰ ${d.start_time}-${d.end_time}]` : ''}
                        {d.auto_apply ? ' ⚡ [Auto-Applied]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Calculation Totals */}
              <div className="pt-4 mt-4 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-200">{formatINR(subtotal)}</span>
                </div>

                {discountDeduction > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatINR(discountDeduction)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-200">Total Payable:</span>
                  <span className="text-2xl font-black text-blue-400">
                    {formatINR(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Proceed Button */}
              <button
                type="button"
                disabled={cartItems.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="w-full mt-5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-98"
              >
                <span>Take Payment & Issue Token</span>
                <span className="bg-blue-700/60 px-2 py-0.5 rounded text-xs">({formatINR(grandTotal)})</span>
              </button>

            </div>
          </div>

        </div>
      )}

      {/* =========================================================
          PAYMENT MODAL WITH PROMINENT CASH / UPI SELECTION
          ========================================================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Select Payment & Guest Info</h3>
                <p className="text-xs text-slate-400">Total Amount to Collect</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-cyan-400">
                  {formatINR(grandTotal)}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PROMINENT PAYMENT MODE TOGGLE: CASH vs UPI */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Select Mode of Payment *
              </label>
              <div className="grid grid-cols-2 gap-3">
                
                {/* Cash Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('cash')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all ${
                    paymentMode === 'cash'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Banknote className="w-6 h-6 mb-1 text-emerald-400" />
                  <span className="font-bold text-xs">CASH PAYMENT</span>
                  <span className="text-[10px] text-slate-400">Physical Currency</span>
                </button>

                {/* UPI / QR Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('upi')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all ${
                    paymentMode === 'upi'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <QrCode className="w-6 h-6 mb-1 text-cyan-400" />
                  <span className="font-bold text-xs">UPI / PAYTM QR</span>
                  <span className="text-[10px] text-slate-400">Scan & Pay Online</span>
                </button>

              </div>
            </div>

            {/* Dynamic Panel based on Payment Mode */}
            {paymentMode === 'upi' ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-32 h-32 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0 border border-slate-300">
                  <img
                    src={settings.payment_qr_image_url || '/uploads/paytm_qr.svg'}
                    alt="UPI QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-200 flex items-center">
                    <QrCode className="w-4 h-4 mr-1 text-cyan-400" />
                    Paytm / UPI QR Code
                  </p>
                  <p className="text-slate-400">
                    Ask customer to scan using Google Pay, PhonePe, Paytm, or BHIM.
                  </p>
                  <p className="text-cyan-400 font-extrabold text-sm pt-1">
                    Amount to Scan: {formatINR(grandTotal)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Exact Cash to Collect:</span>
                  <span className="text-emerald-400 font-black text-base">{formatINR(grandTotal)}</span>
                </div>

                {/* Cash Tendered & Change Return Helper */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Cash Given by Customer
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Change to Return
                    </label>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-amber-300">
                      {formatINR(changeToReturn)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Details Form */}
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Customer Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Rahul"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Mobile Phone (10 digits)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Final Action Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmBooking}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 text-sm font-bold text-white transition-all active:scale-98 disabled:opacity-50 ${
                paymentMode === 'cash'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <span>Confirm & Mark Paid via {paymentMode === 'cash' ? 'CASH' : 'UPI QR'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-200 text-center font-medium"
            >
              Cancel / Back to Game Selection
            </button>

          </div>
        </div>
      )}

      {/* Confirmation & Thermal Receipt Modal */}
      {completedTicket && (
        <ReceiptPrint
          ticket={completedTicket}
          settings={settings}
          onClose={() => setCompletedTicket(null)}
        />
      )}

    </div>
  );
}
