import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatINR } from '../utils/formatters';
import {
  Tag,
  Plus,
  Power,
  X,
  Percent,
  IndianRupee,
  Calendar,
  Clock,
  Zap,
  Edit2,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const ALL_DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' }
];

export default function AdminDiscounts() {
  const [discounts, setDiscounts] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDiscId, setEditingDiscId] = useState(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('percentage');
  const [formValue, setFormValue] = useState('');
  const [formAppliesTo, setFormAppliesTo] = useState('all');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formDaysOfWeek, setFormDaysOfWeek] = useState([]);
  const [formAutoApply, setFormAutoApply] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [discData, gamesData] = await Promise.all([
        api.getDiscounts(false),
        api.getGames(false)
      ]);
      setDiscounts(Array.isArray(discData) ? discData : []);
      setGames(Array.isArray(gamesData) ? gamesData : []);
    } catch (err) {
      console.error('Failed to load discounts or games:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormType('percentage');
    setFormValue('');
    setFormAppliesTo('all');
    setFormStartDate('');
    setFormEndDate('');
    setFormStartTime('');
    setFormEndTime('');
    setFormDaysOfWeek([]);
    setFormAutoApply(false);
    setErrorMsg('');
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (disc) => {
    setEditingDiscId(disc.discount_id);
    setFormName(disc.name || '');
    setFormType(disc.type || 'percentage');
    setFormValue(disc.value || '');
    setFormAppliesTo(disc.applies_to || 'all');
    setFormStartDate(disc.start_date || '');
    setFormEndDate(disc.end_date || '');
    setFormStartTime(disc.start_time || '');
    setFormEndTime(disc.end_time || '');
    setFormDaysOfWeek(Array.isArray(disc.days_of_week) ? disc.days_of_week : []);
    setFormAutoApply(Boolean(disc.auto_apply));
    setErrorMsg('');
    setShowEditModal(true);
  };

  const toggleDaySelection = (dayId) => {
    setFormDaysOfWeek(prev => {
      if (prev.includes(dayId)) {
        return prev.filter(d => d !== dayId);
      } else {
        return [...prev, dayId];
      }
    });
  };

  const setDayPreset = (preset) => {
    if (preset === 'all') {
      setFormDaysOfWeek(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    } else if (preset === 'weekdays') {
      setFormDaysOfWeek(['mon', 'tue', 'wed', 'thu', 'fri']);
    } else if (preset === 'weekends') {
      setFormDaysOfWeek(['sat', 'sun']);
    } else if (preset === 'clear') {
      setFormDaysOfWeek([]);
    }
  };

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    if (!formName || !formValue) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await api.createDiscount({
        name: formName.trim(),
        type: formType,
        value: Number(formValue),
        applies_to: formAppliesTo,
        start_date: formStartDate || '',
        end_date: formEndDate || '',
        start_time: formStartTime || '',
        end_time: formEndTime || '',
        days_of_week: formDaysOfWeek,
        auto_apply: formAutoApply
      });
      setShowAddModal(false);
      resetForm();
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create discount');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDiscount = async (e) => {
    e.preventDefault();
    if (!editingDiscId || !formName || !formValue) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await api.updateDiscount(editingDiscId, {
        name: formName.trim(),
        type: formType,
        value: Number(formValue),
        applies_to: formAppliesTo,
        start_date: formStartDate || '',
        end_date: formEndDate || '',
        start_time: formStartTime || '',
        end_time: formEndTime || '',
        days_of_week: formDaysOfWeek,
        auto_apply: formAutoApply
      });
      setShowEditModal(false);
      resetForm();
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update discount');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (discId) => {
    try {
      await api.toggleDiscount(discId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to toggle discount');
    }
  };

  const filteredDiscounts = discounts.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderScheduleBadge = (disc) => {
    const hasTime = disc.start_time && disc.end_time;
    const hasDays = Array.isArray(disc.days_of_week) && disc.days_of_week.length > 0 && !disc.days_of_week.includes('all');
    const hasDates = disc.start_date || disc.end_date;

    const dayNames = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
    const daysStr = hasDays ? disc.days_of_week.map(d => dayNames[d.toLowerCase()] || d).join(', ') : 'All Days';

    return (
      <div className="space-y-1 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className={hasTime ? 'font-semibold text-cyan-300' : 'text-slate-400'}>
            {hasTime ? `${disc.start_time} - ${disc.end_time}` : 'All Day (24 hrs)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className={hasDays ? 'font-semibold text-blue-300' : 'text-slate-400'}>
            {daysStr}
          </span>
        </div>

        {hasDates && (
          <div className="text-[10px] text-slate-400">
            Dates: {disc.start_date || 'Open'} to {disc.end_date || 'Open'}
          </div>
        )}

        {disc.auto_apply && (
          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded mt-0.5">
            <Zap className="w-2.5 h-2.5" />
            <span>Auto-Applied at POS</span>
          </div>
        )}
      </div>
    );
  };

  const renderDaysPicker = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300">
          Days of Week
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setDayPreset('all')}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            All Days
          </button>
          <button
            type="button"
            onClick={() => setDayPreset('weekdays')}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Mon-Fri
          </button>
          <button
            type="button"
            onClick={() => setDayPreset('weekends')}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Sat-Sun
          </button>
          <button
            type="button"
            onClick={() => setDayPreset('clear')}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {ALL_DAYS.map(day => {
          const isSelected = formDaysOfWeek.includes(day.id);
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => toggleDaySelection(day.id)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500">
        Leave all unselected or select all for &quot;Every Day&quot;. Select specific days for alternate / Happy Days.
      </p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-blue-500" />
            Discounts & Promotional Offers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Set percentage or flat discounts with Happy Hours time windows and day-based schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors"
            title="Refresh Offers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Offer</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter discounts by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading && discounts.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" />
          Loading promotional offers...
        </div>
      ) : filteredDiscounts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
          <Tag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300">No discounts found</p>
          <p className="mt-1">Add promotional discount rules above.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Offer Name</th>
                  <th className="py-3 px-4 font-semibold">Benefit</th>
                  <th className="py-3 px-4 font-semibold">Applies To</th>
                  <th className="py-3 px-4 font-semibold">Time & Day Schedule</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredDiscounts.map(disc => {
                  const appliesGame = games.find(g => g.game_id === disc.applies_to);

                  return (
                    <tr key={disc.discount_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-100 text-sm block">{disc.name}</span>
                        <span className="text-[11px] font-mono text-slate-500">{disc.discount_id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">
                        {disc.type === 'percentage' ? `${disc.value}% OFF` : `₹${disc.value} FLAT OFF`}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {disc.applies_to === 'all' ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs">All Games</span>
                        ) : (
                          <span className="font-medium text-cyan-300">{appliesGame?.name || disc.applies_to}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderScheduleBadge(disc)}
                      </td>
                      <td className="py-3.5 px-4">
                        {disc.active ? (
                          disc.is_currently_live ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                              LIVE NOW
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3 mr-1" />
                              Scheduled
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(disc)}
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                          title="Edit Schedule & Offer"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleToggleActive(disc.discount_id)}
                          className={`px-3 py-1 rounded-md border font-medium text-xs transition-colors ${
                            disc.active
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                        >
                          {disc.active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredDiscounts.map(disc => {
              const appliesGame = games.find(g => g.game_id === disc.applies_to);

              return (
                <div
                  key={disc.discount_id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-100">{disc.name}</h3>
                      <p className="text-base font-bold text-emerald-400 mt-0.5">
                        {disc.type === 'percentage' ? `${disc.value}% OFF` : `₹${disc.value} FLAT OFF`}
                      </p>
                    </div>
                    <div>
                      {disc.active ? (
                        disc.is_currently_live ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            ● LIVE NOW
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Scheduled
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">
                    Applies to: <strong className="text-slate-200">{disc.applies_to === 'all' ? 'All Games' : (appliesGame?.name || disc.applies_to)}</strong>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                    {renderScheduleBadge(disc)}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(disc)}
                      className="px-3 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium"
                    >
                      <Edit2 className="w-3 h-3 inline mr-1 text-amber-400" />
                      Edit
                    </button>

                    <button
                      onClick={() => handleToggleActive(disc.discount_id)}
                      className={`px-3 py-1 rounded-md border text-xs font-medium ${
                        disc.active
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {disc.active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Discount Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {showEditModal ? (
                  <>
                    <Edit2 className="w-4 h-4 text-amber-400" />
                    Edit Discount Schedule & Rules
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-blue-500" />
                    Add New Scheduled Discount Offer
                  </>
                )}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={showEditModal ? handleUpdateDiscount : handleCreateDiscount} className="space-y-4">
              
              {/* Offer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Offer Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Happy Hours (20% Off), Student Special"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Type and Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Value *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={formType === 'percentage' ? 'e.g. 20' : 'e.g. 50'}
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Applies to Game */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Applies To
                </label>
                <select
                  value={formAppliesTo}
                  onChange={(e) => setFormAppliesTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Games in Arcade</option>
                  {games.map(g => (
                    <option key={g.game_id} value={g.game_id}>
                      {g.name} Only
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Window (Happy Hours) */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Specific Time Window (Happy Hours)
                  </label>
                  {(formStartTime || formEndTime) && (
                    <button
                      type="button"
                      onClick={() => { setFormStartTime(''); setFormEndTime(''); }}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Clear Time (All Day)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">From Time</span>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">To Time</span>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Example: Set 14:00 to 18:00 for 2 PM to 6 PM Happy Hours. Leave blank for 24-hr all day.
                </p>
              </div>

              {/* Days of Week Selector */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                {renderDaysPicker()}
              </div>

              {/* Date Range (Optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Auto-Apply Checkbox */}
              <div className="bg-blue-950/30 border border-blue-800/50 p-3 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAutoApply}
                    onChange={(e) => setFormAutoApply(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Auto-Apply at Billing Counter (Domino&apos;s style)
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      When active, this offer will automatically apply to customer carts during the scheduled time window without the cashier having to manually choose it!
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (showEditModal ? 'Update Offer Schedule' : 'Create Scheduled Offer')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
