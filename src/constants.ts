export interface PlotData {
  id: string;
  width: number; // in feet
  height: number; // in feet
  area?: number; // in sq ft
  type: 'A' | 'B' | 'C' | 'D';
}

export const PLOTS: PlotData[] = [
  // Block A (Bottom)
  ...Array.from({ length: 19 }, (_, i) => ({ id: `A${21 - i}`, width: 25, height: 45, type: 'A' as const })),
  { id: 'A2', width: 45.16, height: 20.5, area: 961, type: 'A' },
  { id: 'A1', width: 49.75, height: 25.66, area: 1333, type: 'A' },

  // Block B
  ...Array.from({ length: 19 }, (_, i) => ({ id: `B${21 - i}`, width: 25, height: 45, type: 'B' as const })),
  { id: 'B2', width: 44.9, height: 25.66, area: 1209, type: 'B' },
  { id: 'B1', width: 50.58, height: 20.5, area: 1070, type: 'B' },

  // Block C
  ...Array.from({ length: 18 }, (_, i) => ({ id: `C${20 - i}`, width: 25, height: 40, type: 'C' as const })),
  { id: 'C2', width: 45, height: 20.5, area: 957, type: 'C' },
  { id: 'C1', width: 54.16, height: 20.5, area: 1050, type: 'C' },

  // Block D (Top)
  ...Array.from({ length: 18 }, (_, i) => ({ id: `D${20 - i}`, width: 25, height: 40, type: 'D' as const })),
  { id: 'D2', width: 45.83, height: 20.5, area: 974, type: 'D' },
  { id: 'D1', width: 50.41, height: 20.5, area: 1067, type: 'D' },
];

// Layout configuration
// We'll define the relative positions of the blocks
export const LAYOUT = {
  center: { lat: 25.359823, lng: 75.679593 },
  rotation: -15, // Estimated rotation to align with road
  feetToLat: 0.00000274, // Approximate conversion factor
  feetToLng: 0.00000302,
  roadWidth: 30,
  blockSpacing: 25,
};
