
// Interface for OvertureMaps data
export interface OvertureMapsBuilding {
  id: string;
  type: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  properties: {
    class: string;
    height: number;
    numFloors?: number;
    name?: string;
  };
}

// Interface for 15minCity data
export interface AccessibilityScore {
  type: string; // e.g., 'grocery', 'school', 'healthcare'
  score: number; // 0-100
  minutesToAccess: number;
}

export interface NeighborhoodAccessibility {
  location: {
    lat: number;
    lng: number;
  };
  walkabilityScore: number;
  accessibilityScores: {
    [key: string]: AccessibilityScore;
  };
}

// Mock functions to simulate API calls - in a real implementation, these would make actual API calls
export const fetchOvertureMapsData = async (bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): Promise<OvertureMapsBuilding[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // Mock data for Paris buildings
  return [
    {
      id: "b1",
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[48.87, 2.33], [48.871, 2.33], [48.871, 2.331], [48.87, 2.331], [48.87, 2.33]]
      },
      properties: {
        class: "commercial",
        height: 15,
        numFloors: 5,
        name: "Paris Office Tower"
      }
    },
    {
      id: "b2",
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[48.856, 2.352], [48.857, 2.352], [48.857, 2.353], [48.856, 2.353], [48.856, 2.352]]
      },
      properties: {
        class: "retail",
        height: 12,
        numFloors: 4,
        name: "Marais Shopping Center"
      }
    },
    {
      id: "b3",
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[48.874, 2.347], [48.875, 2.347], [48.875, 2.348], [48.874, 2.348], [48.874, 2.347]]
      },
      properties: {
        class: "commercial",
        height: 25,
        numFloors: 8,
        name: "Opera Business Hub"
      }
    }
  ];
};

export const fetch15minCityData = async (lat: number, lng: number): Promise<NeighborhoodAccessibility> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  // Generate mock accessibility data based on location
  // In a real app, this would fetch from the 15mincity.ai API
  const mockTypes = ['grocery', 'pharmacy', 'park', 'restaurant', 'school', 'healthcare', 'transport'];
  const accessibilityScores: Record<string, AccessibilityScore> = {};
  
  mockTypes.forEach(type => {
    // Generate mock scores based on arrondissement - higher scores in central Paris
    const centralness = 1 - (Math.abs(lat - 48.857) + Math.abs(lng - 2.347)) / 0.1;
    const baseScore = Math.min(100, Math.max(30, Math.round(centralness * 100)));
    
    accessibilityScores[type] = {
      type,
      score: baseScore + Math.floor(Math.random() * 20) - 10, // Add some randomness
      minutesToAccess: Math.max(1, Math.floor(15 * (1 - baseScore/100) + Math.random() * 5))
    };
  });

  return {
    location: { lat, lng },
    walkabilityScore: 65 + Math.floor(Math.random() * 30),
    accessibilityScores
  };
};

// Helper function to convert accessibility score to a color
export const getScoreColor = (score: number): string => {
  if (score >= 90) return '#10B981'; // green-500
  if (score >= 75) return '#34D399'; // green-400
  if (score >= 60) return '#FBBF24'; // amber-400
  if (score >= 40) return '#F59E0B'; // amber-500
  if (score >= 20) return '#EF4444'; // red-500
  return '#B91C1C'; // red-700
};

// Helper to get descriptive text for scores
export const getScoreDescription = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Poor';
  return 'Very Poor';
};
