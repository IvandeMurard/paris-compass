
import React, { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MapView from '@/components/MapView';

const MapPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  console.log("Rendering MapPage component");

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex flex-col flex-1 h-[calc(100vh-4rem)]">
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with filters */}
          <Sidebar isOpen={isSidebarOpen} />
          
          {/* Main content area with explicit height for map container */}
          <div className="flex-1 overflow-hidden ml-0 md:ml-80" style={{ height: '100%' }}>
            <div className="h-full w-full">
              <MapView />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
