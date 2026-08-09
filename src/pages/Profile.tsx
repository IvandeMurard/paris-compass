import React, { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Navigate } from 'react-router-dom';
import { useLocale } from '@/i18n/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BellIcon, BookmarkIcon, UserIcon, MapPinIcon, SettingsIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Seo from '@/components/Seo';
import { toast } from '@/hooks/use-toast';
import { UserPreferences } from '@/types/supabase';

const COPY = {
  fr: {
    myAccount: 'Mon compte',
    profile: 'Profil',
    savedProperties: 'Locaux enregistrés',
    notifications: 'Notifications',
    settings: 'Paramètres',
    profileInfo: 'Informations du profil',
    manageAccount: 'Gérer les informations de votre compte',
    email: 'E-mail',
    signOut: 'Se déconnecter',
    savedTitle: 'Locaux enregistrés',
    savedDescription: 'Les locaux que vous avez enregistrés pour plus tard',
    noSaved: "Vous n'avez enregistré aucun local pour le moment",
    noSavedHint: 'Lorsque vous trouvez des locaux qui vous plaisent, enregistrez-les ici pour les retrouver plus tard',
    notifPrefs: 'Préférences de notification',
    notifDescription: 'Choisissez comment être averti des locaux correspondant à vos critères',
    loadingPrefs: 'Chargement de vos préférences…',
    emailNotifications: 'Notifications par e-mail',
    emailNotificationsBody: 'Recevoir un e-mail lorsque de nouveaux locaux correspondent à vos critères',
    pushNotifications: 'Notifications push',
    pushNotificationsBody: 'Recevoir des notifications dans votre navigateur lorsque de nouveaux locaux correspondent à vos critères',
    accountSettings: 'Paramètres du compte',
    accountSettingsBody: 'Gérer les paramètres et préférences de votre compte',
    errorTitle: 'Erreur',
    errorLoadPrefs: 'Impossible de charger vos préférences',
    prefsUpdatedTitle: 'Préférences mises à jour',
    prefsUpdatedBody: 'Vos préférences de notification ont été enregistrées',
    updateFailedTitle: 'Échec de la mise à jour',
    updateFailedBody: "Impossible d'enregistrer vos préférences",
  },
  en: {
    myAccount: 'My Account',
    profile: 'Profile',
    savedProperties: 'Saved Properties',
    notifications: 'Notifications',
    settings: 'Settings',
    profileInfo: 'Profile Information',
    manageAccount: 'Manage your account information',
    email: 'Email',
    signOut: 'Sign Out',
    savedTitle: 'Saved Properties',
    savedDescription: "Properties you've bookmarked for later",
    noSaved: "You haven't saved any properties yet",
    noSavedHint: 'When you find properties you like, save them here to revisit later',
    notifPrefs: 'Notification Preferences',
    notifDescription: 'Choose how you want to be notified about properties that match your criteria',
    loadingPrefs: 'Loading your preferences...',
    emailNotifications: 'Email Notifications',
    emailNotificationsBody: 'Receive notifications via email when new properties match your criteria',
    pushNotifications: 'Push Notifications',
    pushNotificationsBody: 'Receive notifications in your browser when new properties match your criteria',
    accountSettings: 'Account Settings',
    accountSettingsBody: 'Manage your account settings and preferences',
    errorTitle: 'Error',
    errorLoadPrefs: 'Failed to load your preferences',
    prefsUpdatedTitle: 'Preferences updated',
    prefsUpdatedBody: 'Your notification preferences have been saved',
    updateFailedTitle: 'Update failed',
    updateFailedBody: 'Failed to save your preferences',
  },
} as const;

const Profile = () => {
  const { user, signOut } = useAuth();
  const { locale, lp } = useLocale();
  const copy = COPY[locale];
  const [preferences, setPreferences] = useState<UserPreferences>({
    user_id: user?.id || '',
    email_notifications: false,
    push_notifications: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setPreferences({
            user_id: user.id,
            email_notifications: data.email_notifications,
            push_notifications: data.push_notifications,
          });
        } else {
          // Create default preferences if none exist
          const { error: insertError } = await supabase
            .from('user_preferences')
            .insert([{ 
              user_id: user.id,
              email_notifications: false,
              push_notifications: false,
            }]);
          
          if (insertError) throw insertError;
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
        toast({
          title: copy.errorTitle,
          description: copy.errorLoadPrefs,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserPreferences();
  }, [user]);

  const updatePreference = async (key: keyof Omit<UserPreferences, 'user_id' | 'id' | 'created_at' | 'updated_at'>, value: boolean) => {
    if (!user) return;

    try {
      setPreferences(prev => ({ ...prev, [key]: value }));
      
      const { error } = await supabase
        .from('user_preferences')
        .update({ [key]: value } as Partial<UserPreferences>)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: copy.prefsUpdatedTitle,
        description: copy.prefsUpdatedBody,
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Revert the UI change
      setPreferences(prev => ({ ...prev, [key]: !value }));
      
      toast({
        title: copy.updateFailedTitle,
        description: copy.updateFailedBody,
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return <Navigate to={lp('/signin')} />;
  }

  return (
    <div className="min-h-screen bg-customBg font-sans flex flex-col">
      <Seo title={copy.myAccount} description={copy.manageAccount} path="/profile" noindex />
      <Header isSidebarOpen={false} toggleSidebar={() => {}} />
      
      <div className="flex-1 container mx-auto p-4 md:p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{copy.myAccount}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-1">
              <UserIcon size={16} />
              <span className="hidden sm:inline">{copy.profile}</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-1">
              <BookmarkIcon size={16} />
              <span className="hidden sm:inline">{copy.savedProperties}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1">
              <BellIcon size={16} />
              <span className="hidden sm:inline">{copy.notifications}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <SettingsIcon size={16} />
              <span className="hidden sm:inline">{copy.settings}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{copy.profileInfo}</CardTitle>
                <CardDescription>
                  {copy.manageAccount}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">{copy.email}</p>
                  <p>{user.email}</p>
                </div>
                <Button variant="outline" onClick={() => signOut()}>
                  {copy.signOut}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>{copy.savedTitle}</CardTitle>
                <CardDescription>
                  {copy.savedDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BookmarkIcon className="mx-auto h-12 w-12 mb-3 opacity-20" />
                  <p>{copy.noSaved}</p>
                  <p className="text-sm mt-1">
                    {copy.noSavedHint}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{copy.notifPrefs}</CardTitle>
                <CardDescription>
                  {copy.notifDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <p>{copy.loadingPrefs}</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-notifications" className="text-base">
                          {copy.emailNotifications}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {copy.emailNotificationsBody}
                        </p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={preferences.email_notifications}
                        onCheckedChange={(checked) => 
                          updatePreference('email_notifications', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="push-notifications" className="text-base">
                          {copy.pushNotifications}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {copy.pushNotificationsBody}
                        </p>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={preferences.push_notifications}
                        onCheckedChange={(checked) => 
                          updatePreference('push_notifications', checked)
                        }
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{copy.accountSettings}</CardTitle>
                <CardDescription>
                  {copy.accountSettingsBody}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => signOut()}>
                    {copy.signOut}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
