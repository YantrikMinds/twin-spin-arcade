import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, Lock, User, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-900/30">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-slate-100">
            TWIN SPIN
          </h1>
          <p className="text-xs uppercase font-semibold tracking-widest text-slate-400 mt-1">
            Gaming Arcade Cafe • POS & Management
          </p>
        </div>

        {/* Secure Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-100 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-blue-400" />
              Authorized Access
            </h2>
            <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Secure Session</span>
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Username ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all text-sm disabled:opacity-50 active:scale-98"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">
              Only authorized staff and administration are permitted to log in.
            </p>
          </div>

        </div>

        {/* Cafe Location Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Twin Spin Arcade • Najafgarh, New Delhi
        </p>

      </div>
    </div>
  );
}
