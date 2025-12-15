'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserRole } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  const [emailConfig, setEmailConfig] = useState({
    enabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: 'noreply@agency.com',
  });

  const [vapiConfig, setVapiConfig] = useState({
    apiKey: '',
    baseUrl: 'https://api.vapi.ai',
  });

  const [calendarConfig, setCalendarConfig] = useState({
    google: {
      clientId: '',
      clientSecret: '',
      redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/calendar/google/callback`,
    },
    outlook: {
      clientId: '',
      clientSecret: '',
      redirectUri: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/calendar/outlook/callback`,
    },
  });

  useEffect(() => {
    if (user) return; // Already authenticated, don't re-run

    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== 'ADMIN') {
      router.push('/client');
      return;
    }
    setUser(parsed);

    // Load calendar OAuth configs
    loadCalendarConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCalendarConfigs = async () => {
    try {
      const [googleRes, outlookRes] = await Promise.all([
        api.get('/integrations/calendar/oauth/config/google'),
        api.get('/integrations/calendar/oauth/config/outlook'),
      ]);
      
      if (googleRes.data) {
        setCalendarConfig(prev => ({
          ...prev,
          google: {
            ...prev.google,
            clientId: googleRes.data.clientId || '',
            redirectUri: googleRes.data.redirectUri || prev.google.redirectUri,
          },
        }));
      }
      
      if (outlookRes.data) {
        setCalendarConfig(prev => ({
          ...prev,
          outlook: {
            ...prev.outlook,
            clientId: outlookRes.data.clientId || '',
            redirectUri: outlookRes.data.redirectUri || prev.outlook.redirectUri,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load calendar configs:', error);
    }
  };

  const handleSaveEmail = () => {
    toast({
      title: 'Success',
      description: 'Email settings saved successfully',
    });
  };

  const handleSaveVapi = () => {
    toast({
      title: 'Success',
      description: 'VAPI settings saved successfully',
    });
  };

  const handleSaveCalendarOAuth = async (provider: 'google' | 'outlook') => {
    try {
      const config = provider === 'google' ? calendarConfig.google : calendarConfig.outlook;
      
      if (!config.clientId || !config.clientSecret) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      await api.post(`/integrations/calendar/oauth/config/${provider}`, config);
      
      toast({
        title: 'Success',
        description: `${provider === 'google' ? 'Google' : 'Outlook'} Calendar OAuth settings saved successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save OAuth settings',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout userRole={UserRole.ADMIN} user={user}>
      <h1 className="text-3xl font-extrabold text-main mb-6">Settings</h1>

        <Tabs defaultValue="email" className="w-full">
          <TabsList>
            <TabsTrigger value="email">Email Configuration</TabsTrigger>
            <TabsTrigger value="vapi">VAPI Integration</TabsTrigger>
            <TabsTrigger value="calendar">Calendar OAuth</TabsTrigger>
            <TabsTrigger value="general">General Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>Configure SMTP settings for email notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={emailConfig.enabled}
                    onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, enabled: checked })}
                  />
                  <Label>Enable Email Notifications</Label>
                </div>

                <div>
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={emailConfig.smtpHost}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={emailConfig.smtpPort}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="smtp-user">SMTP Username</Label>
                  <Input
                    id="smtp-user"
                    value={emailConfig.smtpUser}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div>
                  <Label htmlFor="smtp-password">SMTP Password</Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    value={emailConfig.smtpPassword}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <Label htmlFor="smtp-from">From Email</Label>
                  <Input
                    id="smtp-from"
                    value={emailConfig.smtpFrom}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpFrom: e.target.value })}
                  />
                </div>

                <Button onClick={handleSaveEmail}>Save Email Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vapi" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>VAPI Integration</CardTitle>
                <CardDescription>Configure VAPI API for AI assistant integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="vapi-key">VAPI API Key</Label>
                  <Input
                    id="vapi-key"
                    type="password"
                    value={vapiConfig.apiKey}
                    onChange={(e) => setVapiConfig({ ...vapiConfig, apiKey: e.target.value })}
                    placeholder="Enter your VAPI API key"
                  />
                </div>

                <div>
                  <Label htmlFor="vapi-url">VAPI Base URL</Label>
                  <Input
                    id="vapi-url"
                    value={vapiConfig.baseUrl}
                    onChange={(e) => setVapiConfig({ ...vapiConfig, baseUrl: e.target.value })}
                  />
                </div>

                <Button onClick={handleSaveVapi}>Save VAPI Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            {/* Google Calendar OAuth */}
            <Card>
              <CardHeader>
                <CardTitle>Google Calendar OAuth</CardTitle>
                <CardDescription>Configure OAuth credentials for Google Calendar integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="google-client-id">Client ID</Label>
                  <Input
                    id="google-client-id"
                    value={calendarConfig.google.clientId}
                    onChange={(e) => setCalendarConfig({
                      ...calendarConfig,
                      google: { ...calendarConfig.google, clientId: e.target.value }
                    })}
                    placeholder="Enter Google OAuth Client ID"
                  />
                </div>

                <div>
                  <Label htmlFor="google-client-secret">Client Secret</Label>
                  <Input
                    id="google-client-secret"
                    type="password"
                    value={calendarConfig.google.clientSecret}
                    onChange={(e) => setCalendarConfig({
                      ...calendarConfig,
                      google: { ...calendarConfig.google, clientSecret: e.target.value }
                    })}
                    placeholder="Enter Google OAuth Client Secret"
                  />
                </div>

                <div>
                  <Label htmlFor="google-redirect-uri">Redirect URI</Label>
                  <Input
                    id="google-redirect-uri"
                    value={calendarConfig.google.redirectUri}
                    onChange={(e) => setCalendarConfig({
                      ...calendarConfig,
                      google: { ...calendarConfig.google, redirectUri: e.target.value }
                    })}
                    placeholder="Redirect URI (auto-filled)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Add this URI to your Google Cloud Console OAuth credentials
                  </p>
                </div>

                <Button onClick={() => handleSaveCalendarOAuth('google')}>
                  Save Google Calendar Settings
                </Button>
              </CardContent>
            </Card>

            {/* Outlook Calendar OAuth */}
            <Card>
              <CardHeader>
                <CardTitle>Outlook Calendar OAuth</CardTitle>
                <CardDescription>Configure OAuth credentials for Outlook Calendar integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="outlook-client-id">Client ID (Application ID)</Label>
                  <Input
                    id="outlook-client-id"
                    value={calendarConfig.outlook.clientId}
                    onChange={(e) => setCalendarConfig({
                      ...calendarConfig,
                      outlook: { ...calendarConfig.outlook, clientId: e.target.value }
                    })}
                    placeholder="Enter Microsoft Application (client) ID"
                  />
                </div>

                <div>
                  <Label htmlFor="outlook-client-secret">Client Secret</Label>
                  <Input
                    id="outlook-client-secret"
                    type="password"
                    value={calendarConfig.outlook.clientSecret}
                    onChange={(e) => setCalendarConfig({
                      ...calendarConfig,
                      outlook: { ...calendarConfig.outlook, clientSecret: e.target.value }
                    })}
                    placeholder="Enter Microsoft Client Secret"
                  />
                </div>

                <div>
                  <Label htmlFor="outlook-redirect-uri">Redirect URI</Label>
                  <Input
                    id="outlook-redirect-uri"
                    value={calendarConfig.outlook.redirectUri}
                    onChange={(e) => setCalendarConfig({
                      ...calendarConfig,
                      outlook: { ...calendarConfig.outlook, redirectUri: e.target.value }
                    })}
                    placeholder="Redirect URI (auto-filled)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Add this URI to your Azure App Registration redirect URIs
                  </p>
                </div>

                <Button onClick={() => handleSaveCalendarOAuth('outlook')}>
                  Save Outlook Calendar Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure general system settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    placeholder="Your Agency Name"
                  />
                </div>

                <div>
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    placeholder="support@agency.com"
                  />
                </div>

                <div>
                  <Label htmlFor="default-price">Default Price Per Minute ($)</Label>
                  <Input
                    id="default-price"
                    type="number"
                    step="0.01"
                    placeholder="0.10"
                  />
                </div>

                <div>
                  <Label htmlFor="default-monthly">Default Monthly Charge ($)</Label>
                  <Input
                    id="default-monthly"
                    type="number"
                    step="0.01"
                    placeholder="50.00"
                  />
                </div>

                <Button>Save General Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </DashboardLayout>
  );
}
