// Stateless shared helpers used by database and feature code.
export function newUuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}`;
}

export function incrementTrailingNumber(value) {
  const match = String(value || '').match(/^(.*?)(\d+)([^\d]*)$/);
  if (!match) return value;
  return `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, '0')}${match[3]}`;
}

export function preventFormEnterSubmit(event) {
  if (event.key === 'Enter') event.preventDefault();
}

export function escapeHtml(value) {
  const replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return String(value ?? '').replace(/[&<>'"]/g, character => replacements[character]);
}

Object.assign(globalThis, { newUuid, incrementTrailingNumber, preventFormEnterSubmit, escapeHtml });
