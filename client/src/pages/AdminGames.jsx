import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatINR } from '../utils/formatters';
import {
  Gamepad2,
  Plus,
  Edit2,
  Power,
  AlertCircle,
  Save,
  CheckCircle2,
  X,
  RefreshCw,
  Search
} from 'lucide-react';

export default function AdminGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New game modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStations, setNewStations] = useState('1');
  const [adding, setAdding] = useState(false);

  // Edit game modal
  const [editGame, setEditGame] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStations, setEditStations] = useState('1');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchGames = async () => {
    try {
      setLoading(true);
      const data = await api.getGames(false); // get both active & inactive
      setGames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleCreateGame = async (e) => {
    e.preventDefault();
    if (!newName || !newPrice) return;
    setAdding(true);
    setErrorMsg('');
    try {
      await api.createGame({
        name: newName.trim(),
        price_per_person: Number(newPrice),
        station_count: Number(newStations) || 1
      });
      setShowAddModal(false);
      setNewName('');
      setNewPrice('');
      setNewStations('1');
      await fetchGames();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create game');
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (game) => {
    setEditGame(game);
    setEditName(game.name);
    setEditPrice(game.price_per_person);
    setEditStations(game.station_count || 1);
    setErrorMsg('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editGame) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await api.updateGame(editGame.game_id, {
        name: editName.trim(),
        price_per_person: Number(editPrice),
        station_count: Number(editStations) || 1
      });
      setEditGame(null);
      await fetchGames();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update game');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (gameId) => {
    try {
      await api.toggleGame(gameId);
      await fetchGames();
    } catch (err) {
      alert(err.message || 'Failed to toggle game status');
    }
  };

  const filteredGames = games.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = games.filter(g => g.active).length;
  const inactiveCount = games.length - activeCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-blue-500" />
            Games & Attractions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure arcade game attractions, player pricing, and counter availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGames}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors"
            title="Refresh Games"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Game</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Games</span>
          <span className="text-xl font-bold text-white mt-1 block">{games.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Active (Counter)</span>
          <span className="text-xl font-bold text-white mt-1 block">{activeCount}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Disabled</span>
          <span className="text-xl font-bold text-slate-400 mt-1 block">{inactiveCount}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter games by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading && games.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-500" />
          Loading arcade games catalog...
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
          <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300">No games found</p>
          <p className="mt-1">Add a game attraction above to start billing.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Attraction Name</th>
                  <th className="py-3 px-4 font-semibold">Price per Player</th>
                  <th className="py-3 px-4 font-semibold">Station Units</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredGames.map(game => (
                  <tr key={game.game_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-100 text-sm block">{game.name}</span>
                      <span className="text-[11px] font-mono text-slate-500">{game.game_id}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {formatINR(game.price_per_person)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {game.station_count || 1} station
                    </td>
                    <td className="py-3.5 px-4">
                      {game.active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(game)}
                        className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors"
                      >
                        Edit Rate
                      </button>
                      <button
                        onClick={() => handleToggleActive(game.game_id)}
                        className={`px-2.5 py-1 rounded-md border font-medium text-xs transition-colors ${
                          game.active
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {game.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Phone Friendly) */}
          <div className="md:hidden space-y-3">
            {filteredGames.map(game => (
              <div
                key={game.game_id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">{game.name}</h3>
                    <p className="text-base font-bold text-white mt-0.5">
                      {formatINR(game.price_per_person)} <span className="text-[11px] font-normal text-slate-400">/ person</span>
                    </p>
                  </div>
                  <div>
                    {game.active ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Stations: <strong>{game.station_count || 1}</strong></span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(game)}
                      className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
                    >
                      Edit Rate
                    </button>
                    <button
                      onClick={() => handleToggleActive(game.game_id)}
                      className={`px-3 py-1 rounded-md border text-xs font-medium ${
                        game.active
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {game.active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add New Game Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                Add New Game Attraction
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateGame} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Game Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bowling, Bike Racing, VR"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Price Per Person (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 200"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Station Count</label>
                <input
                  type="number"
                  min="1"
                  value={newStations}
                  onChange={(e) => setNewStations(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors"
                >
                  {adding ? 'Saving...' : 'Add Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Game Modal */}
      {editGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-500" />
                Edit {editGame.name}
              </h3>
              <button onClick={() => setEditGame(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Game Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Price Per Person (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Stations Count</label>
                <input
                  type="number"
                  min="1"
                  value={editStations}
                  onChange={(e) => setEditStations(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditGame(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors"
                >
                  {saving ? 'Updating...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
