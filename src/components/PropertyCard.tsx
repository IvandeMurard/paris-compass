import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Euro, Ruler, MapPin, Walk, BarChart3, Users, ExternalLink, Heart } from 'lucide-react';

interface PropertyCardProps {
  id: number;
  title: string;
  price: number;
  size: number;
  address: string;
  arrondissement?: number;
  image?: string;
  footfall?: string;
  airQuality?: string;
  noise?: string;
  lat?: number;
  lng?: number;
}

const PropertyCard = ({ 
  id, 
  title, 
  price, 
  size, 
  address, 
  arrondissement,
  image,
  footfall = "Medium",
  airQuality = "Good",
  noise = "Moderate",
  lat,
  lng
}: PropertyCardProps) => {
  // Generate a quality score based on environmental factors
  const getQualityColor = (quality: string) => {
    switch(quality.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-emerald-100 text-emerald-800';
      case 'moderate': return 'bg-amber-100 text-amber-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-40 bg-gray-200">
        {image ? (
          <img 
            src={image} 
            alt={title} 
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-200">
            <span className="text-gray-400">No image available</span>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="mb-2">
          <h3 className="font-medium text-lg">{title}</h3>
          {arrondissement && (
            <Badge variant="outline" className="text-xs">
              {arrondissement}{arrondissement === 1 ? 'st' : arrondissement === 2 ? 'nd' : arrondissement === 3 ? 'rd' : 'th'} Arrondissement
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Euro size={16} className="mr-2 text-primary" />
            <span className="font-medium">{price.toLocaleString()} €/month</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Ruler size={16} className="mr-2 text-primary" />
            <span>{size} m²</span>
          </div>
          
          <div className="flex items-center text-sm">
            <MapPin size={16} className="mr-2 text-primary" />
            <span className="truncate">{address}</span>
          </div>

          {lat && lng && (
            <div className="flex items-center text-xs text-gray-500">
              <span>Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col items-center">
            <Walk size={14} className="mb-1" />
            <Badge variant="secondary" className={`font-normal ${getQualityColor('good')}`}>
              15min Walk
            </Badge>
          </div>
          
          <div className="flex flex-col items-center">
            <MapPin size={14} className="mb-1" />
            <Badge variant="secondary" className={`font-normal ${getQualityColor(airQuality)}`}>
              {airQuality} Air
            </Badge>
          </div>
          
          <div className="flex flex-col items-center">
            <Walk size={14} className="mb-1" />
            <Badge variant="secondary" className={`font-normal ${getQualityColor(noise)}`}>
              {noise} Noise
            </Badge>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-4 pb-4 pt-0 flex justify-between">
        <Button variant="outline" size="sm" className="flex-1 mr-2">
          <ExternalLink size={14} className="mr-1" /> Details
        </Button>
        <Button variant="ghost" size="icon">
          <Heart size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PropertyCard;
