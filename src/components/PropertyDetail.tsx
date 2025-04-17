
import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Euro, 
  Ruler, 
  MapPin, 
  BarChart3,
  Users, 
  Heart, 
  Mail, 
  Phone, 
  Clock,
  Building,
  Leaf,
  ShoppingCart,
  Layers,
  Bus
} from 'lucide-react';
import { fetch15minCityData, getScoreDescription, getScoreColor } from '@/utils/mapData';

interface PropertyDetailProps {
  property: {
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
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const PropertyDetail = ({ property, isOpen, onClose }: PropertyDetailProps) => {
  const [accessibility, setAccessibility] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchAccessibilityData = async () => {
      if (!property || !isOpen) return;
      
      try {
        setLoading(true);
        // For demo, we use fixed coordinates for Paris
        // In a real app, this would use the property's actual coordinates
        const lat = property.arrondissement ? 48.85 + (property.arrondissement * 0.001) : 48.8566;
        const lng = 2.34 + (property.id * 0.005);
        
        const data = await fetch15minCityData(lat, lng);
        setAccessibility(data);
      } catch (error) {
        console.error("Error fetching accessibility data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccessibilityData();
  }, [property, isOpen]);
  
  if (!property) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property.title}</DialogTitle>
          <DialogDescription>
            {property.address}
            {property.arrondissement && (
              <Badge variant="outline" className="ml-2">
                {property.arrondissement}{property.arrondissement === 1 ? 'st' : property.arrondissement === 2 ? 'nd' : property.arrondissement === 3 ? 'rd' : 'th'} Arrondissement
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Property Image */}
        <div className="h-52 bg-gray-200 rounded-md overflow-hidden">
          {property.image ? (
            <img 
              src={property.image} 
              alt={property.title} 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>
        
        {/* Property Details */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Property Information</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <Euro size={16} className="mr-2 text-primary" />
                <span className="font-medium">{property.price.toLocaleString()} €/month</span>
              </div>
              
              <div className="flex items-center">
                <Ruler size={16} className="mr-2 text-primary" />
                <span>{property.size} m²</span>
              </div>
              
              <div className="flex items-center">
                <Building size={16} className="mr-2 text-primary" />
                <span>Commercial Space</span>
              </div>
              
              <div className="flex items-center">
                <MapPin size={16} className="mr-2 text-primary" />
                <span className="truncate">{property.address}</span>
              </div>
              
              <div className="flex items-center">
                <Clock size={16} className="mr-2 text-primary" />
                <span>Available Immediately</span>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mt-6 mb-2">Environmental Factors</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-gray-50 rounded-md">
                <Users size={20} className="mx-auto mb-1" />
                <Badge className="w-full font-normal">{property.footfall} Footfall</Badge>
              </div>
              
              <div className="text-center p-2 bg-gray-50 rounded-md">
                <Leaf size={20} className="mx-auto mb-1" />
                <Badge className="w-full font-normal">{property.airQuality} Air</Badge>
              </div>
              
              <div className="text-center p-2 bg-gray-50 rounded-md">
                <BarChart3 size={20} className="mx-auto mb-1" />
                <Badge className="w-full font-normal">{property.noise} Noise</Badge>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">15-Minute City Metrics</h3>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <span>Loading accessibility data...</span>
              </div>
            ) : accessibility ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Walkability Score</span>
                    <Badge 
                      style={{ backgroundColor: getScoreColor(accessibility.walkabilityScore) }}
                    >
                      {accessibility.walkabilityScore}/100
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${accessibility.walkabilityScore}%`,
                        backgroundColor: getScoreColor(accessibility.walkabilityScore)
                      }}
                    ></div>
                  </div>
                </div>
                
                <h4 className="text-sm font-medium mt-4">Nearby Amenities</h4>
                <div className="space-y-2">
                  {accessibility.accessibilityScores && Object.values(accessibility.accessibilityScores).map((score: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center">
                        {score.type === 'grocery' && <ShoppingCart size={14} className="mr-1" />}
                        {score.type === 'park' && <Leaf size={14} className="mr-1" />}
                        {score.type === 'healthcare' && <Layers size={14} className="mr-1" />}
                        {score.type === 'transport' && <Bus size={14} className="mr-1" />}
                        {!['grocery', 'park', 'healthcare', 'transport'].includes(score.type) && <MapPin size={14} className="mr-1" />}
                        <span className="text-sm capitalize">{score.type}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs mr-2">{score.minutesToAccess} min</span>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ color: getScoreColor(score.score) }}
                        >
                          {getScoreDescription(score.score)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>No accessibility data available</div>
            )}
            
            <h3 className="text-lg font-medium mt-6 mb-2">Contact Information</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <Mail size={16} className="mr-2 text-primary" />
                <span>contact@parisproperty.com</span>
              </div>
              <div className="flex items-center">
                <Phone size={16} className="mr-2 text-primary" />
                <span>+33 01 23 45 67 89</span>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between items-center mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <div className="space-x-2">
            <Button variant="outline">
              <Heart size={16} className="mr-2" /> Save
            </Button>
            <Button>
              <Mail size={16} className="mr-2" /> Contact Agent
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetail;
