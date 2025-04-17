
import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface Property {
  id: number;
  title: string;
  price: number;
  size: number;
  address: string;
}

const MobileResultsList = () => {
  const fakePropertyResults: Property[] = [
    { id: 1, title: 'Commercial Space in 11th', price: 1750, size: 45, address: '23 Rue de la Roquette, 75011 Paris' },
    { id: 2, title: 'Office in 9th', price: 3200, size: 85, address: '15 Rue de la Chaussée d\'Antin, 75009 Paris' },
    { id: 3, title: 'Retail Space in 1st', price: 4500, size: 120, address: '5 Rue de Rivoli, 75001 Paris' },
  ];

  return (
    <div className="md:hidden">
      <h3 className="font-medium flex items-center mb-4">
        <LayoutGrid size={16} className="mr-2" />
        Results
      </h3>
      
      <div className="space-y-4">
        {fakePropertyResults.map(property => (
          <div key={property.id} className="bg-muted rounded-md p-3">
            <h4 className="font-medium">{property.title}</h4>
            <p className="text-primary font-medium">€{property.price}/month</p>
            <p className="text-sm">{property.size} m²</p>
            <p className="text-xs text-muted-foreground">{property.address}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileResultsList;
