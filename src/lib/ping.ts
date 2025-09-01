export function getApiBase(): string {
  // Prefer Vercel env var, fallback to older name, then localStorage
  const env = (import.meta as any).env || {};
  return env.VITE_API_URL || env.VITE_API_BASE_URL || localStorage.getItem('VITE_API_BASE_URL') || '';
}

export async function ping(): Promise<boolean> {
  const base = getApiBase();
  if(!base) return false;
  try {
    const r = await fetch(base.replace(/\/$/, '') + '/health', { cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  }
}
