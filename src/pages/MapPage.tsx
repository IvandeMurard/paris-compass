
import React, { useState, Suspense, lazy } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

// Dynamically import MapView with SSR disabled
const MapView = lazy(() => import('@/components/MapView'));

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
              <Suspense fallback={
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-muted-foreground">Loading map...</p>
                </div>
              }>
                <MapView />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
