
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useLocale } from '@/i18n/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Bell, Bookmark, Settings } from 'lucide-react';

const COPY = {
  fr: {
    profile: 'Profil',
    savedProperties: 'Locaux enregistrés',
    notifications: 'Notifications',
    settings: 'Paramètres',
  },
  en: {
    profile: 'Profile',
    savedProperties: 'Saved Properties',
    notifications: 'Notifications',
    settings: 'Settings',
  },
} as const;

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const { locale, t, lp } = useLocale();
  const copy = COPY[locale];

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Link to={lp('/signin')}>
          <Button variant="ghost" size="sm">
            {t('auth.signIn')}
          </Button>
        </Link>
        <Link to={lp('/signup')}>
          <Button size="sm">{t('auth.signUp')}</Button>
        </Link>
      </div>
    );
  }

  // Get initials from email
  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.email || 'User')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{t('auth.account')}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <Link to={lp('/profile')}>
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>{copy.profile}</span>
          </DropdownMenuItem>
        </Link>
        
        <Link to={`${lp('/profile')}?tab=saved`}>
          <DropdownMenuItem className="cursor-pointer">
            <Bookmark className="mr-2 h-4 w-4" />
            <span>{copy.savedProperties}</span>
          </DropdownMenuItem>
        </Link>
        
        <Link to={`${lp('/profile')}?tab=notifications`}>
          <DropdownMenuItem className="cursor-pointer">
            <Bell className="mr-2 h-4 w-4" />
            <span>{copy.notifications}</span>
          </DropdownMenuItem>
        </Link>
        
        <Link to={`${lp('/profile')}?tab=settings`}>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>{copy.settings}</span>
          </DropdownMenuItem>
        </Link>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('auth.signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
