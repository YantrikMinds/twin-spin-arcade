import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatINR } from '../utils/formatters';
import {
  Clock,
  Play,
  CheckCircle,
  RefreshCw,
  Users,
  Gamepad2,
  AlertCircle,
  ChevronRight,
  Flame,
  Timer
} from 'lucide-react';

export default function Queue() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const data = await api.getQueue();
      setStations(data);
      setErrorMsg('');
    } catch (err) {
      console.error('Error fetching queue:', err);
      setErrorMsg(err.message || 'Failed to load queue data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // 1-second interval to update live elapsed clocks
    const clockInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    // 10-second auto-poll for queue updates
    const pollInterval = setInterval(() => {
      api.getQueue().then(setStations).catch(() => {});
    }, 10000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(pollInterval);
    };
  }, []);

  const formatElapsedTimer = (isoDateStr) => {
    if (!isoDateStr) return '00:00';
    const start = new Date(isoDateStr).getTime();
    const diffSec = Math.max(0, Math.floor((currentTime - start) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async (ticket_id, item_id) => {
    try {
      setActionLoading(true);
      await api.startQueueSession(ticket_id, item_id);
      await fetchQueue();
    } catch (err) {
      alert(err.message || 'Could not start session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndSession = async (ticket_id, item_id) => {
    try {
      setActionLoading(true);
      await api.endQueueSession(ticket_id, item_id, true); // true = auto promote next
      await fetchQueue();
    } catch (err) {
      alert(err.message || 'Could not end session');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 flex items-center">
            <Clock className="w-8 h-8 mr-3 text-cyan-400" />
            Arcade Queue & Station Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time station occupancy with live second-by-second session timers and automated queue promotion.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading || actionLoading}
          className="self-start sm:self-auto flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-all active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && stations.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3" />
          Loading arcade station queues...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stations.map(station => {
            const isOccupied = !!station.now_playing;
            const timerFormatted = isOccupied ? formatElapsedTimer(station.now_playing.started_at) : '00:00';

            return (
              <div
                key={station.game_id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col"
              >
                {/* Station Title Bar */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${isOccupied ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">{station.game_name}</h2>
                      <span className="text-[11px] text-slate-400">
                        Rate: {formatINR(station.price_per_person)} / person
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                      isOccupied
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}>
                      {isOccupied ? 'Playing Now' : 'Station Free'}
                    </span>
                  </div>
                </div>

                {/* Now Playing Banner */}
                <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center">
                      <Play className="w-3.5 h-3.5 mr-1 text-amber-400 fill-current" />
                      Now Playing
                    </span>
                    {isOccupied && (
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-800/50 flex items-center space-x-1 shadow-sm">
                        <Timer className="w-3 h-3 text-amber-400 animate-spin" />
                        <span>{timerFormatted}</span>
                      </span>
                    )}
                  </div>

                  {isOccupied ? (
                    <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-100">
                            {station.now_playing.customer_name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {station.now_playing.ticket_id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2">
                          <span>{station.now_playing.no_of_persons} {station.now_playing.no_of_persons > 1 ? 'players' : 'player'}</span>
                          {station.now_playing.customer_phone && (
                            <span>• {station.now_playing.customer_phone}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleEndSession(station.now_playing.ticket_id, station.now_playing.item_id)}
                        disabled={actionLoading}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md shadow-rose-600/20 transition-all active:scale-95"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>End Session</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-950/60 rounded-xl p-4 border border-dashed border-slate-800 text-center">
                      <p className="text-xs text-slate-400">Station is currently idle</p>
                      {station.waiting_queue.length > 0 && (
                        <p className="text-[11px] text-cyan-400 font-semibold mt-1">
                          Click "Start" on the next waiting player below!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Up Next Queue */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                      Up Next ({station.waiting_count} in queue)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Completed Today: <strong>{station.completed_today_count}</strong>
                    </span>
                  </div>

                  {station.waiting_queue.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 flex-1 flex items-center justify-center">
                      No players waiting in queue
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-56 pr-1">
                      {station.waiting_queue.map(item => (
                        <div
                          key={item.item_id || item.ticket_id}
                          className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 rounded-md bg-blue-950 border border-blue-800/60 text-blue-300 font-bold flex items-center justify-center text-[11px]">
                              {item.position}
                            </span>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-semibold text-slate-200">{item.customer_name}</span>
                                <span className="text-[10px] font-mono text-slate-400">({item.ticket_id})</span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {item.no_of_persons} {item.no_of_persons > 1 ? 'players' : 'player'}
                              </span>
                            </div>
                          </div>

                          {!isOccupied && item.position === 1 ? (
                            <button
                              onClick={() => handleStartSession(item.ticket_id, item.item_id)}
                              disabled={actionLoading}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center space-x-1 transition-all active:scale-95"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Start</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">
                              Waiting in Queue
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
