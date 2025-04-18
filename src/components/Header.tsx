
import React from 'react';
import { Button } from "@/components/ui/button";
import { Search, Menu, X } from 'lucide-react';
import UserMenu from './UserMenu';
import { Link } from 'react-router-dom';

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
        <Link to="/" className="flex items-center">
          <h1 className="text-xl font-bold text-primary">Compass</h1>
        </Link>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/about">About</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/contact">Contact</Link>
        </Button>
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
