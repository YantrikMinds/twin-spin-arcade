import React, { useState } from 'react';
import { formatINR, formatIST } from '../utils/formatters';
import { Printer, CheckCircle2, QrCode } from 'lucide-react';

export default function ReceiptPrint({ ticket, settings, onPrintCompleted, onClose }) {
  if (!ticket) return null;

  // Local state to toggle between 58mm and 80mm preview
  const [selectedWidth, setSelectedWidth] = useState(settings?.printer_paper_width || '58mm');

  const widthClass = selectedWidth === '80mm' ? 'receipt-80mm' : 'receipt-58mm';

  const handlePrint = () => {
    window.print();
    if (onPrintCompleted) onPrintCompleted();
  };

  return (
    <div>
      {/* On-Screen Receipt Preview Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
          
          <div className="text-center mb-3">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-100">Booking Confirmed</h3>
            <p className="text-xs text-slate-400">Token ID: <span className="text-blue-400 font-mono font-bold">{ticket.ticket_id}</span></p>
          </div>

          {/* Paper Width Quick Switcher */}
          <div className="flex items-center justify-center space-x-2 mb-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Printer Format:</span>
            <button
              type="button"
              onClick={() => setSelectedWidth('58mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedWidth === '58mm'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              58mm
            </button>
            <button
              type="button"
              onClick={() => setSelectedWidth('80mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedWidth === '80mm'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              80mm
            </button>
          </div>

          {/* Thermal Receipt Visual Preview Box */}
          <div className="bg-white text-slate-900 font-mono rounded-lg p-4 shadow-inner text-xs border border-slate-300 max-h-[380px] overflow-y-auto">
            <div className="text-center mb-2">
              <p className="font-extrabold text-sm uppercase tracking-wider">{settings?.store_name || 'TWIN SPIN ARCADE'}</p>
              <p className="text-[10px] text-slate-600">{settings?.address}</p>
              <p className="text-[10px] text-slate-600">Tel: {settings?.phone}</p>
              <div className="border-b border-dashed border-slate-400 my-1.5" />
              <p className="font-bold text-[11px]">ENTRY TOKEN / RECEIPT</p>
              <p className="text-[10px]">{formatIST(ticket.created_at)}</p>
              <p className="text-[10px]">TKT: <strong>{ticket.ticket_id}</strong> | Staff: {ticket.marked_paid_by}</p>
            </div>

            <div className="border-b border-dashed border-slate-400 my-1.5" />

            <div className="text-[11px] mb-1.5">
              <p>Guest: <strong>{ticket.customer_name}</strong></p>
              {ticket.customer_phone && <p>Phone: {ticket.customer_phone}</p>}
            </div>

            <div className="border-b border-dashed border-slate-400 my-1.5" />

            {/* Items Table */}
            <div className="space-y-1 mb-2">
              <div className="flex justify-between font-bold text-[10px] uppercase text-slate-600">
                <span>Game & Persons</span>
                <span>Subtotal</span>
              </div>
              {(ticket.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div>
                    <span className="font-semibold">{item.game_name}</span>
                    <span className="text-[10px] text-slate-600 block">
                      {item.no_of_persons} {item.no_of_persons > 1 ? 'persons' : 'person'} @ {formatINR(item.price_at_booking)}
                    </span>
                  </div>
                  <span className="font-medium">{formatINR(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-slate-400 my-1.5" />

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal (MRP):</span>
                <span>{formatINR(ticket.subtotal)}</span>
              </div>
              {ticket.discount_applied && ticket.discount_applied.amount_deducted > 0 && (
                <>
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Discount — {ticket.discount_applied.name}
                      <span className="font-normal text-slate-500 ml-1">
                        ({ticket.discount_applied.type === 'percentage'
                          ? `${ticket.discount_applied.value}% off`
                          : `₹${ticket.discount_applied.value} flat`})
                      </span>
                    </span>
                    <span>−{formatINR(ticket.discount_applied.amount_deducted)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold text-[10px] bg-emerald-50 px-1 py-0.5 rounded">
                    <span>★ You Saved:</span>
                    <span>{formatINR(ticket.discount_applied.amount_deducted)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-300">
                <span>TOTAL PAID ({ticket.payment_mode?.toUpperCase()}):</span>
                <span>{formatINR(ticket.total_amount)}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Barcode visual simulation */}
            <div className="text-center py-1">
              <div className="font-mono tracking-[4px] text-xs font-black inline-block py-1 px-3 border border-slate-400 rounded">
                ||| | |||| | ||| | || ||
              </div>
              <p className="text-[9px] font-mono tracking-widest text-slate-600 mt-0.5">{ticket.ticket_id}</p>
            </div>

            <div className="text-center text-[10px] text-slate-600 space-y-0.5 mt-1">
              <p className="font-semibold text-slate-800">Please present token at game station</p>
              <p>{settings?.receipt_footer_note || 'Thank you for visiting Twin Spin!'}</p>
              <p className="tracking-widest text-[9px] pt-1">--- CUT HERE ---</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all text-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Token ({selectedWidth})</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-sm transition-colors"
            >
              Done / Close
            </button>
          </div>

        </div>
      </div>

      {/* Hidden Print Template (Targeted by @media print) */}
      <div className="thermal-receipt-print-wrapper">
        <div className={widthClass}>
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {settings?.store_name || 'TWIN SPIN ARCADE CAFE'}
            </div>
            <div style={{ fontSize: '9px' }}>{settings?.address}</div>
            <div style={{ fontSize: '9px' }}>Tel: {settings?.phone}</div>
            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>GAME ENTRY TOKEN</div>
            <div style={{ fontSize: '9px' }}>{formatIST(ticket.created_at)}</div>
            <div style={{ fontSize: '10px', fontWeight: 'bold' }}>TOKEN ID: {ticket.ticket_id}</div>
            <div style={{ fontSize: '9px' }}>Staff: {ticket.marked_paid_by}</div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

          <div style={{ fontSize: '10px', marginBottom: '4px' }}>
            <div>Guest: <strong>{ticket.customer_name}</strong></div>
            {ticket.customer_phone && <div>Phone: {ticket.customer_phone}</div>}
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold' }}>
              <span>GAME</span>
              <span>TOTAL</span>
            </div>
            {(ticket.items || []).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', margin: '2px 0' }}>
                <div>
                  <strong>{item.game_name}</strong> ({item.no_of_persons}p @ {formatINR(item.price_at_booking)})
                </div>
                <div>{formatINR(item.subtotal)}</div>
              </div>
            ))}
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

          <div style={{ fontSize: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal (MRP):</span>
              <span>{formatINR(ticket.subtotal)}</span>
            </div>
            {ticket.discount_applied && ticket.discount_applied.amount_deducted > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                  <span>
                    Discount - {ticket.discount_applied.name}
                    {' '}({ticket.discount_applied.type === 'percentage'
                      ? `${ticket.discount_applied.value}% off`
                      : `Rs.${ticket.discount_applied.value} flat`}):
                  </span>
                  <span>-{formatINR(ticket.discount_applied.amount_deducted)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '9px', background: '#f0fdf4', padding: '1px 2px', borderRadius: '2px' }}>
                  <span>*** YOU SAVED:</span>
                  <span>{formatINR(ticket.discount_applied.amount_deducted)}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '3px', paddingTop: '3px', borderTop: '1px solid #000' }}>
              <span>PAID ({ticket.payment_mode?.toUpperCase()}):</span>
              <span>{formatINR(ticket.total_amount)}</span>
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '5px 0' }} />

          <div style={{ textAlign: 'center', margin: '4px 0' }}>
            <div style={{ fontSize: '10px', letterSpacing: '3px', fontWeight: 'bold' }}>
              ||| | |||| | ||| | || ||
            </div>
            <div style={{ fontSize: '8px' }}>{ticket.ticket_id}</div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '9px' }}>
            <div style={{ fontWeight: 'bold' }}>Present this token at the game counter</div>
            <div>{settings?.receipt_footer_note || 'Thank you for playing at Twin Spin!'}</div>
            <div style={{ margin: '8px 0 0 0', letterSpacing: '2px' }}>- - - - CUT HERE - - - -</div>
          </div>
        </div>
      </div>
    </div>
  );
}
