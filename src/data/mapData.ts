
// Sample walkability data for different areas (would come from 15mincity.ai API)
export const walkabilityData = [
  { center: [48.8566, 2.3522] as [number, number], radius: 1000, score: 90, color: '#4ade80' }, // 1st arrondissement
  { center: [48.8728, 2.3378] as [number, number], radius: 800, score: 85, color: '#86efac' },  // 9th arrondissement
  { center: [48.8534, 2.3751] as [number, number], radius: 900, score: 80, color: '#bbf7d0' },  // 11th arrondissement
  { center: [48.8448, 2.3505] as [number, number], radius: 700, score: 75, color: '#d9f99d' },  // 5th arrondissement
  { center: [48.8673, 2.2898] as [number, number], radius: 1200, score: 65, color: '#fef08a' }, // 16th arrondissement
  { center: [48.8703, 2.3072] as [number, number], radius: 1100, score: 70, color: '#fde047' }  // 8th arrondissement
];

// Sample accessibility data (would come from 15mincity.ai API)
export const accessibilityData = {
  schools: [
    { position: [48.8546, 2.3470] as [number, number], radius: 500, score: 95 },
    { position: [48.8670, 2.3210] as [number, number], radius: 450, score: 90 },
    { position: [48.8490, 2.3380] as [number, number], radius: 600, score: 85 }
  ],
  groceries: [
    { position: [48.8566, 2.3500] as [number, number], radius: 600, score: 90 },
    { position: [48.8700, 2.3400] as [number, number], radius: 500, score: 85 },
    { position: [48.8530, 2.3700] as [number, number], radius: 550, score: 80 }
  ],
  healthcare: [
    { position: [48.8580, 2.3450] as [number, number], radius: 700, score: 85 },
    { position: [48.8650, 2.3300] as [number, number], radius: 650, score: 80 },
    { position: [48.8510, 2.3650] as [number, number], radius: 800, score: 75 }
  ]
};

export const accessibilityColors = {
  schools: '#3b82f6', // blue
  groceries: '#10b981', // green
  healthcare: '#ef4444' // red
} as const;

