import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { api } from '../utils/api';
import {
  Settings,
  QrCode,
  Printer,
  Store,
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  Users,
  UserPlus,
  Trash2,
  Key,
  ShieldCheck,
  X,
  FileSpreadsheet,
  ExternalLink,
  Code,
  Copy,
  Send,
  RefreshCw
} from 'lucide-react';

export default function AdminSettings() {
  const { settings, updateSettings, refreshSettings } = useSettings();

  // Form states
  const [storeName, setStoreName] = useState(settings.store_name || 'Twin Spin Arcade Cafe');
  const [tagline, setTagline] = useState(settings.tagline || '');
  const [address, setAddress] = useState(settings.address || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [printerWidth, setPrinterWidth] = useState(settings.printer_paper_width || '58mm');
  const [footerNote, setFooterNote] = useState(settings.receipt_footer_note || '');
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState(settings.google_sheet_webhook_url || '');

  // Google Sheet Webhook Test states
  const [testingSheet, setTestingSheet] = useState(false);
  const [sheetTestSuccess, setSheetTestSuccess] = useState('');
  const [sheetTestError, setSheetTestError] = useState('');
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // QR upload states
  const [uploadingQR, setUploadingQR] = useState(false);
  const [qrSuccess, setQrSuccess] = useState('');
  const [qrError, setQrError] = useState('');
  const fileInputRef = useRef(null);

  // Settings save states
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Staff accounts states
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [userRole, setUserRole] = useState('billing');
  const [userActionError, setUserActionError] = useState('');
  const [userActionSuccess, setUserActionSuccess] = useState('');

  // Reset password states
  const [resetUser, setResetUser] = useState(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await api.getUsers();
      setUsersList(data);
    } catch (err) {
      console.warn('Could not load users:', err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const [syncingPending, setSyncingPending] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const checkPendingSync = async () => {
    try {
      const report = await api.getDashboardReports();
      setPendingSyncCount(report.pending_sheet_sync || 0);
    } catch {}
  };

  useEffect(() => {
    checkPendingSync();
  }, []);

  const handleManualSyncPending = async () => {
    setSyncingPending(true);
    setSheetTestSuccess('');
    setSheetTestError('');
    try {
      const res = await api.syncPendingSheets();
      if (res.synced_count > 0) {
        setSheetTestSuccess(`✅ ${res.message}`);
        setTimeout(() => setSheetTestSuccess(''), 6000);
      } else {
        setSheetTestSuccess(res.message);
        setTimeout(() => setSheetTestSuccess(''), 5000);
      }
      await checkPendingSync();
    } catch (err) {
      setSheetTestError(err.message || 'Sync failed');
    } finally {
      setSyncingPending(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess('');
    setSettingsError('');
    try {
      await updateSettings({
        store_name: storeName.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        printer_paper_width: printerWidth,
        receipt_footer_note: footerNote.trim(),
        google_sheet_webhook_url: sheetWebhookUrl.trim()
      });
      setSettingsSuccess('Settings saved successfully!');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      setSettingsError(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestSheetWebhook = async () => {
    if (!sheetWebhookUrl.trim()) {
      setSheetTestError('Please enter a Google Apps Script Webhook URL first.');
      return;
    }
    setTestingSheet(true);
    setSheetTestSuccess('');
    setSheetTestError('');
    try {
      const res = await api.testGoogleSheet(sheetWebhookUrl.trim());
      setSheetTestSuccess('✅ Test row sent successfully! Check your Google Sheet now for the entry.');
      setTimeout(() => setSheetTestSuccess(''), 6000);
    } catch (err) {
      setSheetTestError(err.message || 'Failed to connect to Google Sheet Webhook.');
    } finally {
      setTestingSheet(false);
    }
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingQR(true);
    setQrSuccess('');
    setQrError('');

    try {
      const formData = new FormData();
      formData.append('qr_image', file);
      await api.uploadQR(formData);
      await refreshSettings();
      setQrSuccess('Payment QR code image replaced successfully!');
      setTimeout(() => setQrSuccess(''), 4000);
    } catch (err) {
      setQrError(err.message || 'Failed to upload QR image');
    } finally {
      setUploadingQR(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setUserActionError('');
    try {
      await api.createUser({
        username: newUsername.trim(),
        password: newPassword,
        name: newName.trim(),
        role: userRole
      });
      setShowAddUserModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setUserActionSuccess('Staff account created successfully!');
      setTimeout(() => setUserActionSuccess(''), 4000);
      await fetchUsers();
    } catch (err) {
      setUserActionError(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Delete staff account for '${username}'?`)) return;
    try {
      await api.deleteUser(userId);
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Could not delete user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetUser || !resetPasswordVal) return;
    try {
      await api.updateUserPassword(resetUser.user_id, resetPasswordVal);
      setResetUser(null);
      setResetPasswordVal('');
      alert('Password updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update password');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-cyan-400" />
          System, QR & Staff Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Manage UPI QR payment code, thermal printer configuration, cafe metadata, and staff accounts.
        </p>
      </div>

      {/* Active Data Store Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Data Storage Engine</span>
            <p className="text-sm font-bold text-slate-100 flex items-center mt-0.5">
              <span>{settings.data_adapter || 'Google Sheets / Local Store'}</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Connected & Synchronized
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Google Sheets Real-Time Live Sync Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center flex-wrap gap-1.5">
                <span>Google Sheets Live Sync</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Real-time IST
                </span>
                {pendingSyncCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    {pendingSyncCount} Pending Sync
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    All Synced
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Pushes every counter booking directly into your Google Sheet with auto-retry on reconnect.
              </p>
            </div>
          </div>

          {settings.google_sheet_url && (
            <a
              href={settings.google_sheet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 transition-colors w-fit"
            >
              <span>Open Connected Sheet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {sheetTestSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{sheetTestSuccess}</span>
          </div>
        )}

        {sheetTestError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{sheetTestError}</span>
          </div>
        )}

        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Google Apps Script Webhook URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={sheetWebhookUrl}
                onChange={(e) => setSheetWebhookUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestSheetWebhook}
                disabled={testingSheet || !sheetWebhookUrl.trim()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 shrink-0"
              >
                <Send className={`w-3.5 h-3.5 ${testingSheet ? 'animate-spin' : ''}`} />
                <span>{testingSheet ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <span className="text-[11px] text-slate-400">
              Guaranteed sync active — auto-retries offline bookings every 3 mins
            </span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleManualSyncPending}
                disabled={syncingPending || !sheetWebhookUrl.trim()}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingPending ? 'animate-spin' : ''}`} />
                <span>{syncingPending ? 'Syncing...' : 'Retry Pending Sync'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowScriptModal(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
              >
                <Code className="w-3.5 h-3.5" />
                <span>View Apps Script Code</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Static UPI Payment QR Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center">
          <QrCode className="w-5 h-5 mr-2 text-cyan-400" />
          Static UPI Payment QR Code
        </h2>
        <p className="text-xs text-slate-400">
          Upload your personal UPI QR code (Google Pay, PhonePe, Paytm, or BHIM). This image is displayed clearly beside the calculated grand total on the Counter POS screen during checkout.
        </p>

        {qrSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{qrSuccess}</span>
          </div>
        )}

        {qrError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{qrError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
          {/* QR Preview Box */}
          <div className="w-40 h-40 bg-white rounded-xl p-2 flex items-center justify-center border border-slate-300 shadow-md shrink-0">
            {settings.payment_qr_image_url ? (
              <img
                src={settings.payment_qr_image_url}
                alt="Uploaded UPI QR"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-2">
                <QrCode className="w-16 h-16 text-slate-400 mx-auto" />
                <span className="text-[10px] text-slate-500 block font-semibold mt-1">No QR Uploaded</span>
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1">
            <p className="text-xs text-slate-300">
              Accepted formats: <strong>PNG, JPG, WEBP</strong> (Max 5MB). High resolution square image recommended.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleQRUpload}
              className="hidden"
            />

            <button
              type="button"
              disabled={uploadingQR}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploadingQR ? 'Uploading...' : 'Upload / Replace QR Image'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Staff Accounts Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-400" />
              Billing Staff Accounts
            </h2>
            <p className="text-xs text-slate-400">
              Create and manage counter operator login accounts for accountability.
            </p>
          </div>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff User</span>
          </button>
        </div>

        {userActionSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            {userActionSuccess}
          </div>
        )}

        <div className="space-y-2">
          {usersList.map(u => (
            <div
              key={u.user_id}
              className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold uppercase ${
                  u.role === 'admin' ? 'bg-blue-950 text-blue-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {u.username.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200">{u.name || u.username}</span>
                    <span className="text-[10px] font-mono text-slate-400">(@{u.username})</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    u.role === 'admin' ? 'text-blue-400' : 'text-emerald-400'
                  }`}>
                    {u.role === 'admin' ? 'Administrator' : 'Counter Operator'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => { setResetUser(u); setResetPasswordVal(''); }}
                  title="Change Password"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                </button>
                {u.username !== 'admin' && (
                  <button
                    onClick={() => handleDeleteUser(u.user_id, u.username)}
                    title="Delete Account"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Cafe Metadata & Thermal Printer Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-100 flex items-center mb-4">
          <Store className="w-5 h-5 mr-2 text-cyan-400" />
          Receipt & Thermal Printer Settings
        </h2>

        {settingsSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{settingsSuccess}</span>
          </div>
        )}

        {settingsError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{settingsError}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          
          {/* Thermal Paper Width Selection */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Thermal Paper Width Format
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Select the paper roll width installed on your thermal receipt printer.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                printerWidth === '58mm'
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="printerWidth"
                  value="58mm"
                  checked={printerWidth === '58mm'}
                  onChange={(e) => setPrinterWidth(e.target.value)}
                  className="text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <span className="font-bold text-xs block text-slate-200">58mm Thermal Paper</span>
                  <span className="text-[10px] text-slate-400">Standard compact thermal rolls (2 inch)</span>
                </div>
              </label>

              <label className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                printerWidth === '80mm'
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="printerWidth"
                  value="80mm"
                  checked={printerWidth === '80mm'}
                  onChange={(e) => setPrinterWidth(e.target.value)}
                  className="text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <span className="font-bold text-xs block text-slate-200">80mm Thermal Paper</span>
                  <span className="text-[10px] text-slate-400">Wide high-speed POS thermal rolls (3 inch)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Store Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Cafe / Store Name</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Store Address (on receipt)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Support / Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Receipt Footer Note</label>
            <input
              type="text"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              placeholder="e.g. Tokens non-refundable. Valid for today only."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save All Settings'}</span>
            </button>
          </div>

        </form>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center">
                <UserPlus className="w-4 h-4 mr-2 text-cyan-400" />
                Create New Staff Account
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userActionError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {userActionError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rohit, priya"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rohit Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="billing">Billing Staff (Counter Operator)</option>
                  <option value="admin">Admin (Manager / Owner)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-all"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center">
                <Key className="w-4 h-4 mr-2 text-amber-400" />
                Reset Password
              </h3>
              <button onClick={() => setResetUser(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Set new password for <strong>{resetUser.username}</strong>:
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="password"
                required
                placeholder="New password (min 4 chars)"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Apps Script Code Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center">
                <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-400" />
                Google Apps Script Code for Live Sheet Sync
              </h3>
              <button onClick={() => setShowScriptModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="font-bold text-cyan-400">Easy 3-Step Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Open your Google Sheet where you want booking entries recorded.</li>
                  <li>Click on menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Paste the code below, click <strong>Deploy &gt; New deployment</strong>, select type <strong>Web app</strong>, set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>, then copy the Web app URL and paste it here!</li>
                </ol>
              </div>

              <div className="relative">
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-72">
{`function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Automatically add header if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Date (IST)", "Time (IST)", "Ticket ID", "Customer Name", 
        "Phone", "Games / Items", "Subtotal (₹)", "Discount", 
        "Total (₹)", "Payment Mode", "Cashier"
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#1e293b").setFontColor("#38bdf8");
    }
    
    sheet.appendRow([
      data.date_ist || new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data.time_ist || new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data.ticket_id || "",
      data.customer_name || "Walk-in Guest",
      data.customer_phone || "-",
      data.games_summary || "-",
      data.subtotal || 0,
      data.discount_name ? data.discount_name + " (-₹" + (data.discount_amount || 0) + ")" : "None",
      data.total_amount || 0,
      data.payment_mode || "CASH",
      data.cashier || "staff"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    const code = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Date (IST)", "Time (IST)", "Ticket ID", "Customer Name", 
        "Phone", "Games / Items", "Subtotal (₹)", "Discount", 
        "Total (₹)", "Payment Mode", "Cashier"
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#1e293b").setFontColor("#38bdf8");
    }
    
    sheet.appendRow([
      data.date_ist || new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data.time_ist || new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data.ticket_id || "",
      data.customer_name || "Walk-in Guest",
      data.customer_phone || "-",
      data.games_summary || "-",
      data.subtotal || 0,
      data.discount_name ? data.discount_name + " (-₹" + (data.discount_amount || 0) + ")" : "None",
      data.total_amount || 0,
      data.payment_mode || "CASH",
      data.cashier || "staff"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
                    navigator.clipboard.writeText(code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 3000);
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5 shadow"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
