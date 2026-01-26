// Real-world user phrases for regression testing
export interface TestPhrase {
  input: string;
  expectedParsed: boolean;
  expectedHasTime: boolean;
  expectedConfidence: 'high' | 'medium' | 'low';
  expectedStatus: 'pending' | 'leak' | 'expired';
  description: string;
}

// Fixed reference date: Monday, Jan 1, 2024 10:00 AM
export const MOCK_NOW = new Date(2024, 0, 1, 10, 0, 0);

export const USER_PHRASES: TestPhrase[] = [
  // High confidence - relative dates with time
  {
    input: 'mañana 19:00 dentista',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'high',
    expectedStatus: 'leak',
    description: 'Tomorrow with specific time'
  },
  {
    input: 'hoy a las 15:30 reunión equipo',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'high',
    expectedStatus: 'leak',
    description: 'Today with time'
  },
  {
    input: 'pasado mañana 10:00 presentación',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'high',
    expectedStatus: 'leak',
    description: 'Day after tomorrow with time'
  },
  
  // Medium confidence - day of week
  {
    input: 'viernes reunión con cliente',
    expectedParsed: true,
    expectedHasTime: false,
    expectedConfidence: 'medium',
    expectedStatus: 'leak',
    description: 'Day of week without time'
  },
  {
    input: 'el lunes entrega proyecto',
    expectedParsed: true,
    expectedHasTime: false,
    expectedConfidence: 'medium',
    expectedStatus: 'pending',
    description: 'Next Monday (outside 48h window)'
  },
  
  // High confidence - specific dates
  {
    input: 'cita 15/01 doctor',
    expectedParsed: true,
    expectedHasTime: false,
    expectedConfidence: 'high',
    expectedStatus: 'pending',
    description: 'Specific date dd/mm format'
  },
  {
    input: '02/01 a las 20:00 cena',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'high',
    expectedStatus: 'leak',
    description: 'Date with time'
  },
  
  // Edge case - "el 15" format
  {
    input: 'el 15 cumpleaños',
    expectedParsed: true,
    expectedHasTime: false,
    expectedConfidence: 'medium',
    expectedStatus: 'pending',
    description: 'Day number only'
  },
  
  // Low confidence - ambiguous time
  {
    input: 'mañana en la tarde llamar',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'low',
    expectedStatus: 'pending',
    description: 'Ambiguous time of day'
  },
  {
    input: 'hoy en la noche evento',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'low',
    expectedStatus: 'pending',
    description: 'Ambiguous evening time'
  },
  
  // No date detected
  {
    input: 'comprar leche y pan',
    expectedParsed: false,
    expectedHasTime: false,
    expectedConfidence: 'high',
    expectedStatus: 'pending',
    description: 'No date information'
  },
  {
    input: 'llamar a Juan',
    expectedParsed: false,
    expectedHasTime: false,
    expectedConfidence: 'high',
    expectedStatus: 'pending',
    description: 'Task without date'
  },
  
  // Time variations
  {
    input: 'mañana a las 7 desayuno',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'high',
    expectedStatus: 'leak',
    description: 'Single digit hour (AM)'
  },
  {
    input: 'hoy a las 7 pm reunión',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'high',
    expectedStatus: 'leak',
    description: 'Hour with PM indicator'
  },
  
  // Multiple days ahead
  {
    input: 'jueves próximo conferencia',
    expectedParsed: true,
    expectedHasTime: false,
    expectedConfidence: 'medium',
    expectedStatus: 'pending',
    description: 'Next week day'
  },
  
  // Date rollover edge cases
  {
    input: '31/12 fin de año',
    expectedParsed: true,
    expectedHasTime: false,
    expectedConfidence: 'high',
    expectedStatus: 'pending',
    description: 'End of year date'
  },
  {
    input: '01/01 año nuevo',
    expectedParsed: true,
    expectedHasTime: false,
    expectedConfidence: 'high',
    expectedStatus: 'expired',
    description: 'Same day as mock now (should be expired)'
  },
  
  // Complex phrases
  {
    input: 'recordar el viernes 14:30 revisar documentos',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'high',
    expectedStatus: 'leak',
    description: 'Day of week with time'
  },
  {
    input: 'mañana 08:00 gimnasio antes del trabajo',
    expectedParsed: true,
    expectedHasTime: true,
    expectedConfidence: 'high',
    expectedStatus: 'leak',
    description: 'Early morning time'
  },
  
  // Boundary cases for leak detection (48h window)
  {
    input: '03/01 evento límite',
    expectedParsed: true,
    expectedHasTime: false,
    expectedConfidence: 'high',
    expectedStatus: 'leak',
    description: 'Exactly 48h from now (within window)'
  }
];
