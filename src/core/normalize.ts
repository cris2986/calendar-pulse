// Text normalization utilities

const STOPWORDS_ES = [
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para',
  'que', 'es', 'y', 'o', 'pero', 'si', 'no', 'me', 'te',
  'se', 'lo', 'le', 'su', 'mi', 'tu', 'este', 'ese', 'aquel',
  'esta', 'esa', 'aquella', 'muy', 'mas', 'menos', 'como',
  'cuando', 'donde', 'quien', 'cual', 'hay', 'he', 'ha',
  'hemos', 'han', 'ser', 'estar', 'tener', 'hacer', 'ir',
  'voy', 'va', 'vamos', 'van', 'tengo', 'tiene', 'tienen',
  'hago', 'hace', 'hacen', 'soy', 'eres', 'somos', 'son',
  'estoy', 'estas', 'estamos', 'estan'
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

export function extractKeywords(text: string, minLength = 3, maxKeywords = 10): string[] {
  const normalized = normalize(text);
  const tokens = normalized.split(' ').filter(token => 
    token.length >= minLength && !STOPWORDS_ES.includes(token)
  );
  
  // Return unique keywords, limited to maxKeywords
  return Array.from(new Set(tokens)).slice(0, maxKeywords);
}

export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter(token => !STOPWORDS_ES.includes(token));
}
