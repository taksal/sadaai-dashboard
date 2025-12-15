'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { UserRole } from '@/types';
import api from '@/lib/api';

// Google Calendar Icon
const GoogleCalendarIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 3C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5Z" fill="#4285F4"/>
    <path d="M5 7H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V7Z" fill="white"/>
    <path d="M7 3V5M17 3V5" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 10H10V12H8V10Z" fill="#EA4335"/>
    <path d="M11 10H13V12H11V10Z" fill="#FBBC04"/>
    <path d="M14 10H16V12H14V10Z" fill="#34A853"/>
    <path d="M8 13H10V15H8V13Z" fill="#FBBC04"/>
    <path d="M11 13H13V15H11V13Z" fill="#34A853"/>
    <path d="M14 13H16V15H14V13Z" fill="#4285F4"/>
    <path d="M8 16H10V18H8V16Z" fill="#34A853"/>
    <path d="M11 16H13V18H11V16Z" fill="#4285F4"/>
    <path d="M14 16H16V18H14V16Z" fill="#EA4335"/>
  </svg>
);

// Outlook Calendar Icon
const OutlookCalendarIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4C3 2.89543 3.89543 2 5 2H19C20.1046 2 21 2.89543 21 4V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V4Z" fill="#0078D4"/>
    <path d="M5 6H19V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6Z" fill="white"/>
    <path d="M7 2V4M17 2V4" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 10C13.6569 10 15 11.3431 15 13C15 14.6569 13.6569 16 12 16C10.3431 16 9 14.6569 9 13C9 11.3431 10.3431 10 12 10Z" fill="#0078D4"/>
    <path d="M12 11.5C12.8284 11.5 13.5 12.1716 13.5 13C13.5 13.8284 12.8284 14.5 12 14.5C11.1716 14.5 10.5 13.8284 10.5 13C10.5 12.1716 11.1716 11.5 12 11.5Z" fill="white"/>
  </svg>
);

export default function ClientIntegrationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connections, setConnections] = useState<any>({
    googleConnected: false,
    googleEmail: null,
    outlookConnected: false,
    outlookEmail: null,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== 'CLIENT') {
      router.push('/admin');
      return;
    }
    setUser(parsed);

    loadConnections();

    // Check for OAuth callback messages
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success) {
      if (success === 'google_connected') {
        setMessage({ type: 'success', text: 'Google Calendar connected successfully!' });
      } else if (success === 'outlook_connected') {
        setMessage({ type: 'success', text: 'Outlook Calendar connected successfully!' });
      }
      // Clear URL parameters
      window.history.replaceState({}, '', '/client/integrations');
      loadConnections();
    }

    if (error) {
      setMessage({ type: 'error', text: `Connection failed: ${decodeURIComponent(error)}` });
      window.history.replaceState({}, '', '/client/integrations');
    }
  }, [router]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations/calendar/connections/status/all');
      setConnections(response.data);
    } catch (error: any) {
      console.error('Failed to load connections:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to load calendar connections'
      });
    } finally {
      setLoading(false);
    }
  };

  const connectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      setConnecting(provider);
      setMessage(null);

      const response = await api.get(`/integrations/calendar/${provider}/auth`);

      if (response.data.authUrl) {
        // Redirect to OAuth authorization page
        window.location.href = response.data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error(`Failed to connect ${provider}:`, error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || `Failed to connect ${provider} Calendar`
      });
      setConnecting(null);
    }
  };

  const disconnectCalendar = async (provider: 'google' | 'outlook') => {
    if (!confirm(`Are you sure you want to disconnect ${provider === 'google' ? 'Google' : 'Outlook'} Calendar?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/integrations/calendar/connections/${provider}`);
      setMessage({
        type: 'success',
        text: `${provider === 'google' ? 'Google' : 'Outlook'} Calendar disconnected successfully`
      });
      await loadConnections();
    } catch (error: any) {
      console.error(`Failed to disconnect ${provider}:`, error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || `Failed to disconnect ${provider} Calendar`
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout userRole={UserRole.CLIENT} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Connect your calendars to enable automatic appointment booking via AI assistant
          </p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Google Calendar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <GoogleCalendarIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <CardTitle>Google Calendar</CardTitle>
                    {!connections.googleConnected && (
                      <CardDescription>Connect your Google Calendar</CardDescription>
                    )}
                  </div>
                </div>
                {!loading && connections.googleConnected && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : connections.googleConnected ? (
                <>
                  {connections.googleEmail && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-green-900">{connections.googleEmail}</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Appointments will be automatically synced with your calendar.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disconnectCalendar('google')}
                    disabled={loading}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enable automatic appointment booking and syncing.
                  </p>
                  <Button
                    onClick={() => connectCalendar('google')}
                    disabled={connecting !== null}
                    className="w-full"
                  >
                    {connecting === 'google' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Connect Google Calendar
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Outlook Calendar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <OutlookCalendarIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <CardTitle>Outlook Calendar</CardTitle>
                    {!connections.outlookConnected && (
                      <CardDescription>Connect your Outlook Calendar</CardDescription>
                    )}
                  </div>
                </div>
                {!loading && connections.outlookConnected && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : connections.outlookConnected ? (
                <>
                  {connections.outlookEmail && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-green-900">{connections.outlookEmail}</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Appointments will be automatically synced with your calendar.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disconnectCalendar('outlook')}
                    disabled={loading}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enable automatic appointment booking and syncing.
                  </p>
                  <Button
                    onClick={() => connectCalendar('outlook')}
                    disabled={connecting !== null}
                    className="w-full"
                  >
                    {connecting === 'outlook' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Connect Outlook Calendar
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How Calendar Integration Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Connect Your Calendar</p>
                  <p className="text-sm text-muted-foreground">
                    Click connect and authorize access to your Google or Outlook calendar
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">AI Assistant Checks Availability</p>
                  <p className="text-sm text-muted-foreground">
                    When customers call to book appointments, your AI assistant automatically checks your calendar availability
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Automatic Booking</p>
                  <p className="text-sm text-muted-foreground">
                    Appointments are automatically created in your connected calendar with customer details
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium">Real-time Sync</p>
                  <p className="text-sm text-muted-foreground">
                    All appointments stay in sync between your calendar and the platform
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
