import { TokenUnlock } from '../types';

export async function fetchUnlocks(): Promise<TokenUnlock[]> {
  try {
    const res = await fetch('/api/unlocks');
    if (!res.ok) {
      throw new Error(`Failed to fetch unlocks: ${res.status}`);
    }
    const data = await res.json();
    return data.unlocks || [];
  } catch (err) {
    console.error('Error fetching unlock data:', err);
    return [];
  }
}
