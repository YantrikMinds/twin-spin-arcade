import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatINR, formatIST } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import ReceiptPrint from '../components/ReceiptPrint';
import {
  Receipt,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  User,
  Phone,
  Calendar,
  AlertCircle,
  X,
  Save,
  Download,
  FileSpreadsheet,
  Coins
} from 'lucide-react';

export default function TicketsHistory() {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchTicketId, setSearchTicketId] = useState('');

  // Reprint modal
  const [printTicket, setPrintTicket] = useState(null);

  // Admin edit modal
  const [editTicket, setEditTicket] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAge, setEditAge] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Day summary modal
  const [showDaySummary, setShowDaySummary] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await api.getTickets({
        customer_name: searchName,
        customer_phone: searchPhone,
        date: searchDate,
        ticket_id: searchTicketId
      });
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [searchDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleClearFilters = () => {
    setSearchName('');
    setSearchPhone('');
    setSearchDate('');
    setSearchTicketId('');
    api.getTickets().then(setTickets);
  };

  // CSV Export for Excel
  const handleExportCSV = () => {
    if (tickets.length === 0) {
      alert('No tickets to export.');
      return;
    }

    const headers = ['Ticket ID', 'Customer Name', 'Phone', 'Email', 'Games', 'Subtotal', 'Discount Name', 'Discount Deducted', 'Total Amount', 'Payment Mode', 'Billed By', 'Date & Time (IST)'];
    
    const rows = tickets.map(t => {
      const gamesList = (t.items || []).map(i => `${i.game_name} (x${i.no_of_persons})`).join('; ');
      return [
        t.ticket_id,
        `"${(t.customer_name || '').replace(/"/g, '""')}"`,
        `"${t.customer_phone || ''}"`,
        `"${t.customer_email || ''}"`,
        `"${gamesList}"`,
        t.subtotal || 0,
        `"${t.discount_applied?.name || 'None'}"`,
        t.discount_applied?.amount_deducted || 0,
        t.total_amount || 0,
        t.payment_mode?.toUpperCase() || 'CASH',
        `"${t.marked_paid_by || ''}"`,
        `"${formatIST(t.created_at)}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TwinSpin_Bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for Day Summary
  const totalRev = tickets.reduce((s, t) => s + (Number(t.total_amount) || 0), 0);
  const isUpi = (t) => t.payment_mode === 'upi' || t.payment_mode === 'qr';
  const cashRev = tickets.filter(t => !isUpi(t)).reduce((s, t) => s + (Number(t.total_amount) || 0), 0);
  const upiRev = tickets.filter(t => isUpi(t)).reduce((s, t) => s + (Number(t.total_amount) || 0), 0);

  // Admin actions
  const openEditModal = (t) => {
    setEditTicket(t);
    setEditName(t.customer_name);
    setEditPhone(t.customer_phone || '');
    setEditEmail(t.customer_email || '');
    setEditAge(t.customer_age || '');
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editTicket) return;
    setSavingEdit(true);
    setEditError('');
    try {
      await api.updateTicket(editTicket.ticket_id, {
        customer_name: editName.trim(),
        customer_phone: editPhone.trim(),
        customer_email: editEmail.trim(),
        customer_age: editAge ? Number(editAge) : null
      });
      setEditTicket(null);
      await fetchTickets();
    } catch (err) {
      setEditError(err.message || 'Failed to update ticket');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm(`Are you sure you want to permanently delete ticket ${ticketId}?`)) {
      return;
    }
    try {
      await api.deleteTicket(ticketId);
      await fetchTickets();
    } catch (err) {
      alert(err.message || 'Failed to delete ticket');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 flex items-center">
            <Receipt className="w-8 h-8 mr-3 text-cyan-400" />
            {isAdmin ? 'Tickets & Booking Records' : 'Past Tickets History'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {isAdmin
              ? 'Complete ticket history with full editing and admin control rights.'
              : 'Read-only view of customer bookings. Click "Reprint" to generate thermal token.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDaySummary(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-amber-400 transition-all active:scale-95"
          >
            <Coins className="w-4 h-4" />
            <span>Day Register Summary</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <form onSubmit={handleSearchSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Customer Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Search name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Mobile Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Search phone..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Date Filter
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Ticket ID
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTicketId}
                onChange={(e) => setSearchTicketId(e.target.value)}
                placeholder="e.g. TKT-1001"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end space-x-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Reset Filters
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Tickets Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-xs">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mr-2" />
            Loading booking records...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No booking records match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Ticket ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Games & Persons</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tickets.map(ticket => (
                  <tr key={ticket.ticket_id} className="hover:bg-slate-800/40 transition-colors">
                    
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">
                      {ticket.ticket_id}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{ticket.customer_name}</div>
                      {ticket.customer_phone && (
                        <div className="text-[11px] text-slate-400">{ticket.customer_phone}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {(ticket.items || []).map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-slate-800/80 px-2 py-0.5 rounded text-[11px] text-slate-300 mr-1 mb-1 border border-slate-700/60"
                          >
                            {it.game_name} <strong className="text-cyan-400">×{it.no_of_persons}</strong>
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-extrabold text-sm text-slate-100">
                        {formatINR(ticket.total_amount)}
                      </div>
                      {ticket.discount_applied && (
                        <div className="text-[10px] text-emerald-400">
                          Disc: -{formatINR(ticket.discount_applied.amount_deducted)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        (ticket.payment_mode === 'upi' || ticket.payment_mode === 'qr')
                          ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                      }`}>
                        {(ticket.payment_mode === 'upi' || ticket.payment_mode === 'qr') ? 'UPI' : 'Cash'}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        By: {ticket.marked_paid_by}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {formatIST(ticket.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => setPrintTicket(ticket)}
                        title="Print / Reprint Token"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg transition-colors border border-slate-700/80"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openEditModal(ticket)}
                            title="Edit Ticket Details"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors border border-slate-700/80"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket.ticket_id)}
                            title="Delete Ticket"
                            className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-rose-400 rounded-lg transition-colors border border-slate-700/80 hover:border-rose-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Day Register Summary Modal */}
      {showDaySummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center">
                <Coins className="w-4 h-4 mr-2 text-amber-400" />
                Register / Drawer Summary
              </h3>
              <button onClick={() => setShowDaySummary(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span className="text-slate-400">Total Bookings Count:</span>
                <span className="font-bold text-slate-100">{tickets.length} tickets</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between text-emerald-400">
                <span>Physical Cash in Drawer:</span>
                <span className="font-bold">{formatINR(cashRev)}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between text-blue-400">
                <span>Online UPI Receipts:</span>
                <span className="font-bold">{formatINR(upiRev)}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between text-sm font-bold text-slate-100 pt-2 border-t border-slate-800">
                <span>Grand Total Collections:</span>
                <span className="text-cyan-400 font-black">{formatINR(totalRev)}</span>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Day Register Summary</span>
            </button>
          </div>

          {/* Hidden Thermal Print Template for Day Register Summary */}
          <div className="thermal-receipt-print-wrapper">
            <div className="receipt-58mm">
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {settings?.store_name || 'TWIN SPIN ARCADE CAFE'}
                </div>
                <div style={{ fontSize: '9px' }}>{settings?.address}</div>
                {settings?.phone && <div style={{ fontSize: '9px' }}>Tel: {settings?.phone}</div>}
                <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>DAILY REGISTER SUMMARY</div>
                <div style={{ fontSize: '9px' }}>Generated: {formatIST(new Date().toISOString())}</div>
                <div style={{ fontSize: '9px' }}>Staff: {user?.name || user?.username}</div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

              <div style={{ fontSize: '10px', spaceY: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span>Total Bookings:</span>
                  <strong>{tickets.length} tickets</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span>Cash in Drawer:</span>
                  <strong>{formatINR(cashRev)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                  <span>UPI / Online:</span>
                  <strong>{formatINR(upiRev)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0 2px 0', paddingTop: '3px', borderTop: '1px solid #000', fontSize: '11px', fontWeight: 'bold' }}>
                  <span>TOTAL SALES:</span>
                  <span>{formatINR(totalRev)}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px' }}>
                <div style={{ height: '24px' }}></div>
                <div style={{ borderTop: '1px solid #666', width: '80%', margin: '0 auto 2px auto' }}></div>
                <div>Cashier / Manager Signature</div>
                <div style={{ margin: '6px 0 0 0', letterSpacing: '2px' }}>- - - - END OF REPORT - - - -</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Ticket Modal */}
      {editTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center">
                <Edit2 className="w-4 h-4 mr-2 text-amber-400" />
                Edit Ticket ({editTicket.ticket_id})
              </h3>
              <button onClick={() => setEditTicket(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {editError}
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Mobile Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditTicket(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reprint Thermal Receipt Modal */}
      {printTicket && (
        <ReceiptPrint
          ticket={printTicket}
          settings={settings}
          onClose={() => setPrintTicket(null)}
        />
      )}

    </div>
  );
}
