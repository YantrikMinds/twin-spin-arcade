export function formatINR(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

export function formatIST(isoDateStr) {
  if (!isoDateStr) return '';
  const date = new Date(isoDateStr);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
}

export function formatISTDate(isoDateStr) {
  if (!isoDateStr) return '';
  const date = new Date(isoDateStr);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatISTTime(isoDateStr) {
  if (!isoDateStr) return '';
  const date = new Date(isoDateStr);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
}

export function formatShortDate(isoDateStr) {
  if (!isoDateStr) return '';
  const date = new Date(isoDateStr);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short'
  }).format(date);
}

export function getElapsedMinutes(isoDateStr) {
  if (!isoDateStr) return 0;
  const start = new Date(isoDateStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / 60000));
}
