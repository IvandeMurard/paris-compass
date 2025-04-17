
import React, { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

const About = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} />
        
        {/* Main content */}
        <div className="flex-1 p-6 ml-0 md:ml-80">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">About Paris Property Compass</h1>
            
            <div className="prose prose-slate max-w-none">
              <p className="text-lg mb-4">
                Paris Property Compass is your ultimate guide to navigating the vibrant Parisian property market.
                Our platform combines detailed property listings with comprehensive neighborhood data to help you
                make informed decisions about where to live or invest in the City of Light.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
              <p>
                We believe that finding the perfect property goes beyond the physical space itself. That's why we provide
                data-driven insights about walkability, accessibility to essential services, air quality, noise levels,
                and more for every location in Paris.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">The 15-Minute City Concept</h2>
              <p>
                Our platform is built around the "15-minute city" urban planning concept championed by Paris Mayor Anne Hidalgo.
                This philosophy promotes neighborhoods where everything residents need is accessible within a 15-minute walk or bike ride.
              </p>
              <p>
                We visualize this data on our interactive maps, allowing you to see which areas best meet your lifestyle needs.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">Our Data</h2>
              <p>
                We combine property listings from trusted partners with open data sources from the Paris municipality,
                environmental monitoring agencies, and urban planning departments to create a comprehensive view of each neighborhood.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
