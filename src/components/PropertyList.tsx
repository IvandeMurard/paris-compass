
import React from 'react';
import PropertyCard from './PropertyCard';

// Sample data that would come from API/state
const sampleProperties = [
  { 
    id: 1, 
    title: 'Commercial Space in 11th', 
    price: 1750, 
    size: 45, 
    address: '23 Rue de la Roquette, 75011 Paris',
    arrondissement: 11,
    footfall: "High",
    airQuality: "Good",
    noise: "Moderate",
    lat: 48.8534,
    lng: 2.3751
  },
  { 
    id: 2, 
    title: 'Office in 9th', 
    price: 3200, 
    size: 85, 
    address: '15 Rue de la Chaussée d\'Antin, 75009 Paris',
    arrondissement: 9,
    footfall: "Very High",
    airQuality: "Moderate",
    noise: "High",
    lat: 48.8728,
    lng: 2.3378
  },
  { 
    id: 3, 
    title: 'Retail Space in 1st', 
    price: 4500, 
    size: 120, 
    address: '5 Rue de Rivoli, 75001 Paris',
    arrondissement: 1,
    footfall: "Excellent",
    airQuality: "Moderate",
    noise: "High",
    lat: 48.8566,
    lng: 2.3522
  },
  { 
    id: 4, 
    title: 'Studio Office in 5th', 
    price: 1200, 
    size: 35, 
    address: '18 Rue Mouffetard, 75005 Paris',
    arrondissement: 5,
    footfall: "Medium",
    airQuality: "Good",
    noise: "Low",
    lat: 48.8448,
    lng: 2.3505
  },
  { 
    id: 5, 
    title: 'Spacious Shop in 16th', 
    price: 5800, 
    size: 150, 
    address: '88 Avenue Kléber, 75016 Paris',
    arrondissement: 16,
    footfall: "Medium",
    airQuality: "Excellent",
    noise: "Low",
    lat: 48.8673,
    lng: 2.2898
  },
  { 
    id: 6, 
    title: 'Modern Office in 8th', 
    price: 6200, 
    size: 180, 
    address: '45 Avenue des Champs-Élysées, 75008 Paris',
    arrondissement: 8,
    footfall: "Very High",
    airQuality: "Moderate",
    noise: "High",
    lat: 48.8703,
    lng: 2.3072
  }
];

// Export the sample data for use in other components
export { sampleProperties };

const PropertyList = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
      {sampleProperties.map(property => (
        <PropertyCard key={property.id} {...property} />
      ))}
    </div>
  );
};

export default PropertyList;
