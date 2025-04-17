
import React from 'react';
import { Button } from "@/components/ui/button";
import { Search, Menu, X } from 'lucide-react';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header = ({ isSidebarOpen, toggleSidebar }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          aria-label="Toggle sidebar"
          className="mr-2 md:hidden"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <h1 className="text-xl font-bold text-primary">Paris Property Compass</h1>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">About</Button>
        <Button variant="ghost" size="sm">Contact</Button>
      </div>
    </header>
  );
};

export default Header;
