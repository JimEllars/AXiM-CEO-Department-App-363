const PREFIX = 'axim-ceo';

export function readPersistedState(key, fallback) {
  try {
    const value = localStorage.getItem(`${PREFIX}:${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writePersistedState(key, value) {
  try {
    localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    // Local persistence is optional and must never block the dashboard.
  }
}