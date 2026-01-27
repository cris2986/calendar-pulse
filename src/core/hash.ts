// Semantic hashing for event matching

import { extractKeywords } from './normalize';

export async function generateSemanticHash(
  date: Date,
  hasTime: boolean,
  text: string
): Promise<string> {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = hasTime 
    ? date.toTimeString().slice(0, 5) // HH:MM
    : 'no-time';
  
  const keywords = extractKeywords(text).sort().join('|');
  const payload = `${dateStr}|${timeStr}|${keywords}`;
  
  // Use Web Crypto API for SHA-1
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
