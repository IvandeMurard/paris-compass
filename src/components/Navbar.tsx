
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu";
import { Home, Map, User, Info, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const Navbar = () => {
  const location = useLocation();
  
  // Define navigation links
  const navLinks = [
    { path: '/', label: 'Home', icon: <Home className="h-4 w-4 mr-2" /> },
    { path: '/map', label: 'Map View', icon: <Map className="h-4 w-4 mr-2" /> },
    { path: '/profile', label: 'Profile', icon: <User className="h-4 w-4 mr-2" /> },
    { path: '/about', label: 'About', icon: <Info className="h-4 w-4 mr-2" /> },
    { path: '/contact', label: 'Contact', icon: <Phone className="h-4 w-4 mr-2" /> }
  ];
  
  return (
    <div className="bg-background/95 backdrop-blur supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b border-border/40">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <NavigationMenu className="mx-auto">
          <NavigationMenuList className="flex flex-wrap justify-center">
            {navLinks.map((link) => (
              <NavigationMenuItem key={link.path}>
                <Link to={link.path}>
                  <NavigationMenuLink 
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "flex items-center",
                      location.pathname === link.path ? "bg-accent text-accent-foreground" : ""
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        
        <div className="hidden md:flex items-center">
          <Button variant="default" size="sm" asChild>
            <Link to="/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
