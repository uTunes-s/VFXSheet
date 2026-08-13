// Stateless shared helpers used by database and feature code.
function newUuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}`;
}

function incrementTrailingNumber(value) {
  const match = String(value || '').match(/^(.*?)(\d+)([^\d]*)$/);
  if (!match) return value;
  return `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, '0')}${match[3]}`;
}
