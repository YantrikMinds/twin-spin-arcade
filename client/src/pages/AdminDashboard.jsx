import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatINR, formatIST } from '../utils/formatters';
import {
  LayoutDashboard,
  IndianRupee,
  Ticket,
  Users,
  QrCode,
  Banknote,
  Gamepad2,
  RefreshCw,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function AdminDashboard({ onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardReports();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySync = async () => {
    try {
      setSyncingSheets(true);
      const res = await api.syncPendingSheets();
      setSyncFeedback(res.message);
      await fetchDashboard();
      setTimeout(() => setSyncFeedback(''), 5000);
    } catch (err) {
      setSyncFeedback('Sync failed. Please check internet connection.');
      setTimeout(() => setSyncFeedback(''), 5000);
    } finally {
      setSyncingSheets(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-500" />
            Operations & Sales Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Daily register sales, payment splits, and station occupancy overview.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="self-start sm:self-auto flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" />
          Loading register metrics...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Pending Google Sheet Sync Alert Banner */}
          {data?.pending_sheet_sync > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>{data.pending_sheet_sync} ticket{data.pending_sheet_sync > 1 ? 's' : ''}</strong> waiting to sync to Google Sheet (offline / queued). System auto-retries every 3 minutes.
                </span>
              </div>
              <button
                onClick={handleRetrySync}
                disabled={syncingSheets}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-xs flex items-center space-x-1.5 transition-all disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingSheets ? 'animate-spin' : ''}`} />
                <span>{syncingSheets ? 'Syncing...' : 'Retry Sync Now'}</span>
              </button>
            </div>
          )}

          {syncFeedback && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Sales Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-2">
                {formatINR(data?.today_sales || 0)}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center text-emerald-400 font-medium">
                  <Banknote className="w-3.5 h-3.5 mr-1" />
                  Cash: {data?.payment_modes?.cash || 0}
                </span>
                <span className="flex items-center text-blue-400 font-medium">
                  <QrCode className="w-3.5 h-3.5 mr-1" />
                  UPI: {data?.payment_modes?.upi ?? data?.payment_modes?.qr ?? 0}
                </span>
              </div>
            </div>

            {/* Total Tickets Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Bookings</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Ticket className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-2">
                {data?.today_tickets || 0}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
                All-Time Total: <strong className="text-slate-200">{data?.total_historical_tickets || 0} tickets</strong>
              </div>
            </div>

            {/* Total Players Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Players Count</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-2">
                {data?.today_players || 0} <span className="text-xs font-normal text-slate-400">persons</span>
              </p>
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
                Avg Group Size: <strong className="text-slate-200">{data?.today_tickets > 0 ? (data.today_players / data.today_tickets).toFixed(1) : 0} persons</strong>
              </div>
            </div>

          </div>

          {/* Sales Breakdown by Game Attraction */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-blue-500" />
              Station Performance (Today)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {(data?.sales_by_game || []).map(g => {
                const totalRev = data?.today_sales || 1;
                const percent = Math.min(100, Math.round((g.total_revenue / (totalRev || 1)) * 100));

                return (
                  <div key={g.game_id} className="bg-slate-950 rounded-lg p-3.5 border border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-slate-200">{g.name}</span>
                      <span className="text-xs font-bold text-white">{formatINR(g.total_revenue)}</span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-sm overflow-hidden mb-2.5">
                      <div
                        className="bg-blue-500 h-full rounded-sm"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{g.total_persons} players</span>
                      <span>{g.total_tickets} tickets</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Bookings & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Recent Bookings (8 cols) */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-blue-500" />
                  Recent Counter Bookings
                </h2>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('tickets')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    View Register History →
                  </button>
                )}
              </div>

              {(!data?.recent_tickets || data.recent_tickets.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No bookings registered yet today.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recent_tickets.slice(0, 5).map(t => (
                    <div
                      key={t.ticket_id}
                      className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-semibold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                          {t.ticket_id}
                        </span>
                        <div>
                          <p className="font-medium text-slate-200">{t.customer_name}</p>
                          <p className="text-[11px] text-slate-400">{formatIST(t.created_at)}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-white block">{formatINR(t.total_amount)}</span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          {t.payment_mode === 'cash' ? 'Cash' : 'UPI QR'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions (4 cols) */}
            <div className="lg:col-span-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2.5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Quick Navigation
                </h2>
                
                <button
                  onClick={() => onNavigateTab && onNavigateTab('billing')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors text-xs text-slate-200 flex items-center justify-between"
                >
                  <span className="font-medium">Open Counter Billing POS</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onNavigateTab && onNavigateTab('queue')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors text-xs text-slate-200 flex items-center justify-between"
                >
                  <span className="font-medium">Station Timers & Queue</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onNavigateTab && onNavigateTab('games')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors text-xs text-slate-200 flex items-center justify-between"
                >
                  <span className="font-medium">Manage Game Attractions</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onNavigateTab && onNavigateTab('settings')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors text-xs text-slate-200 flex items-center justify-between"
                >
                  <span className="font-medium">System Settings & Sheets</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
