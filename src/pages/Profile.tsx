
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BellIcon, BookmarkIcon, UserIcon, MapPinIcon, SettingsIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { toast } from '@/hooks/use-toast';
import { UserPreferences } from '@/types/supabase';

const Profile = () => {
  const { user, signOut } = useAuth();
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
        // Use type assertion to work around the type constraints
        const { data, error } = await (supabase
          .from('user_preferences') as any)
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
          const { error: insertError } = await (supabase
            .from('user_preferences') as any)
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
          title: 'Error',
          description: 'Failed to load your preferences',
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
      
      // Use type assertion to work around the type constraints
      const { error } = await (supabase
        .from('user_preferences') as any)
        .update({ [key]: value })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Revert the UI change
      setPreferences(prev => ({ ...prev, [key]: !value }));
      
      toast({
        title: 'Update failed',
        description: 'Failed to save your preferences',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return <Navigate to="/signin" />;
  }

  return (
    <div className="min-h-screen bg-customBg font-sans flex flex-col">
      <Header isSidebarOpen={false} toggleSidebar={() => {}} />
      
      <div className="flex-1 container mx-auto p-4 md:p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Account</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-1">
              <UserIcon size={16} />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-1">
              <BookmarkIcon size={16} />
              <span className="hidden sm:inline">Saved Properties</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1">
              <BellIcon size={16} />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <SettingsIcon size={16} />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Email</p>
                  <p>{user.email}</p>
                </div>
                <Button variant="outline" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>Saved Properties</CardTitle>
                <CardDescription>
                  Properties you've bookmarked for later
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BookmarkIcon className="mx-auto h-12 w-12 mb-3 opacity-20" />
                  <p>You haven't saved any properties yet</p>
                  <p className="text-sm mt-1">
                    When you find properties you like, save them here to revisit later
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about properties that match your criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <p>Loading your preferences...</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-notifications" className="text-base">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Receive notifications via email when new properties match your criteria
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
                          Push Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Receive notifications in your browser when new properties match your criteria
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
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => signOut()}>
                    Sign Out
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
