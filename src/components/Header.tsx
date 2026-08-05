
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
        <Link to="/" className="flex flex-col leading-tight">
          <span className="text-xl font-bold text-primary">Compass</span>
          <span className="hidden sm:block text-xs text-muted-foreground">
            Trouver un local commercial en Île-de-France par son environnement
          </span>
        </Link>
      </div>
      <div className="flex items-center space-x-1">
        <span className="hidden xl:inline text-xs text-muted-foreground mr-2">
          Conçu par Ivan de Murard
        </span>
        <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
          <Link to="/guides">Guides</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
          <Link to="/methodologie">Méthodologie</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
          <Link to="/sources">Sources</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/faq">FAQ</Link>
        </Button>
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
