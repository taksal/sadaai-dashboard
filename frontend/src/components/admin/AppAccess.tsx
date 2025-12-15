'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Layout, Phone, Calendar, Settings, BarChart, Shield } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { triggerForceLogout } from '@/lib/forceLogout';

interface User {
  id: string;
  name: string;
  appAccess?: string[];
}

interface AppAccessProps {
  user: User;
  onUpdate: () => void;
}

interface AppModule {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
}

const availableModules: AppModule[] = [
  // Pages
  {
    id: 'dashboard',
    name: 'Dashboard Page',
    description: 'Main dashboard with analytics overview',
    icon: Layout,
    category: 'Pages',
  },
  {
    id: 'calls',
    name: 'Call History Page',
    description: 'Full call history page with search and filters',
    icon: Phone,
    category: 'Pages',
  },
  {
    id: 'integrations',
    name: 'Integrations Page',
    description: 'Third-party integrations and settings',
    icon: Settings,
    category: 'Pages',
  },
  {
    id: 'appointments',
    name: 'Appointments Page',
    description: 'Calendar appointments and booking management',
    icon: Calendar,
    category: 'Pages',
  },

  // Dashboard Widgets
  {
    id: 'live_calls',
    name: 'Live Calls Widget',
    description: 'Real-time active calls monitoring',
    icon: Phone,
    category: 'Dashboard Widgets',
  },
  {
    id: 'call_trends',
    name: 'Call Trends Chart',
    description: 'Line chart showing call volume over time',
    icon: BarChart,
    category: 'Dashboard Widgets',
  },
  {
    id: 'call_distribution',
    name: 'Call Type Distribution',
    description: 'Pie chart showing inbound/outbound call breakdown',
    icon: BarChart,
    category: 'Dashboard Widgets',
  },
  {
    id: 'recent_calls',
    name: 'Recent Calls Table',
    description: 'Table showing latest calls',
    icon: Phone,
    category: 'Dashboard Widgets',
  },
  {
    id: 'monthly_plan',
    name: 'Monthly Plan Usage',
    description: 'Billing cycle and minute usage tracker',
    icon: BarChart,
    category: 'Dashboard Widgets',
  },
  {
    id: 'billable_minutes',
    name: 'Billable Minutes Display',
    description: 'Total billable minutes counter',
    icon: BarChart,
    category: 'Dashboard Widgets',
  },

  // Date Filter Access (Paid Features)
  {
    id: 'date_filter_7_days',
    name: 'Last 7 Days Filter',
    description: 'Free tier - Access to last 7 days of call data',
    icon: Calendar,
    category: 'Date Filter Access',
  },
  {
    id: 'date_filter_15_days',
    name: 'Last 15 Days Filter',
    description: 'Paid feature - Access to last 15 days of call data',
    icon: Calendar,
    category: 'Date Filter Access',
  },
  {
    id: 'date_filter_30_days',
    name: 'Last 30 Days Filter',
    description: 'Paid feature - Access to last 30 days of call data',
    icon: Calendar,
    category: 'Date Filter Access',
  },
  {
    id: 'date_filter_all_time',
    name: 'All Time Filter',
    description: 'Premium feature - Access to all historical call data',
    icon: Calendar,
    category: 'Date Filter Access',
  },

  // Call Details Features (Paid Features)
  {
    id: 'call_recording',
    name: 'Call Recording',
    description: 'Paid feature - Access to call recordings in call details',
    icon: Phone,
    category: 'Call Details Features',
  },
];

export function AppAccess({ user, onUpdate }: AppAccessProps) {
  const { toast } = useToast();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [originalModules, setOriginalModules] = useState<string[]>([]);

  useEffect(() => {
    const modules = user.appAccess && Array.isArray(user.appAccess)
      ? user.appAccess
      : [
          'dashboard', 'calls', 'appointments', 'integrations',
          'live_calls', 'call_trends', 'call_distribution', 'recent_calls',
          'monthly_plan', 'billable_minutes',
          'date_filter_7_days' // Default free tier
        ];

    setSelectedModules(modules);
    setOriginalModules(modules); // Store original state
  }, [user.appAccess, user.id]); // Add user.id to reset when user changes

  // Check if changes were made
  const hasChanges = JSON.stringify([...selectedModules].sort()) !== JSON.stringify([...originalModules].sort());

  const updateAccessMutation = useMutation({
    mutationFn: async () => {
      // Update app access
      await api.patch(`/users/${user.id}`, {
        appAccess: selectedModules,
      });

      // Force logout ONLY this specific user via API
      await api.post(`/users/${user.id}/force-logout`);

      // Trigger immediate logout event for this user across all tabs
      triggerForceLogout(user.id);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Access updated for ${user.name}. User has been logged out immediately.`,
      });
      setOriginalModules(selectedModules); // Update original state after successful save
      onUpdate();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update app access',
        variant: 'destructive',
      });
    },
  });

  const handleToggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSelectAll = () => {
    setSelectedModules(availableModules.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedModules([]);
  };

  const handleSave = () => {
    if (selectedModules.length === 0) {
      toast({
        title: 'Warning',
        description: 'Please select at least one module',
        variant: 'destructive',
      });
      return;
    }
    updateAccessMutation.mutate();
  };

  const groupedModules = availableModules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, AppModule[]>);

  return (
    <div className="space-y-4">
      {/* Currently Active Modules - Always Visible */}
      {selectedModules.length > 0 && (
        <div className="card border-l-4 border-l-green-500">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              Active Modules ({selectedModules.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Modules currently accessible to {user.name}
            </p>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {selectedModules.map((moduleId) => {
                const module = availableModules.find((m) => m.id === moduleId);
                if (!module) return null;
                const Icon = module.icon;
                return (
                  <div
                    key={moduleId}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-50 to-green-100 text-green-800 rounded-pill text-xs font-medium border border-green-200"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{module.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                App Access Configuration
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Control which features and modules this user can access
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-9 rounded-pill"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="h-9 rounded-pill"
              >
                Deselect All
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-5">
          {Object.entries(groupedModules).map(([category, modules]) => (
            <div key={category} className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                {category}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modules.map((module) => {
                  const Icon = module.icon;
                  const isSelected = selectedModules.includes(module.id);

                  return (
                    <div
                      key={module.id}
                      className={`flex items-start gap-3 p-4 border rounded-card cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-gradient-to-r from-primary/5 to-primary/10 shadow-sm'
                          : 'border-border hover:border-primary/30 hover:bg-muted/30'
                      }`}
                      onClick={() => handleToggleModule(module.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleModule(module.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <h5 className="font-semibold text-sm text-foreground">{module.name}</h5>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="border-t border-border pt-5 space-y-3">
            {hasChanges && (
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-card border border-yellow-200">
                <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Unsaved Changes</p>
                  <p className="text-xs text-yellow-800 mt-0.5">
                    You have modified access settings for {user.name}. Click "Save Access Configuration" to apply changes.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-primary/5 rounded-card border border-border">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Important Notice</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Access changes will take effect after the user logs out. Saving will automatically log out {user.name}.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-bold text-primary">{selectedModules.length}</span> of <span className="font-semibold">{availableModules.length}</span> modules selected
                {hasChanges && <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-pill text-xs font-semibold">Modified</span>}
              </div>
              <Button
                onClick={handleSave}
                disabled={updateAccessMutation.isPending || selectedModules.length === 0 || !hasChanges}
                className={`h-10 px-6 rounded-pill ${hasChanges ? 'bg-gradient-to-r from-[#540D9B] to-[#004769] hover:opacity-90' : ''}`}
                variant={hasChanges ? 'default' : 'secondary'}
              >
                {updateAccessMutation.isPending ? 'Saving...' : hasChanges ? 'Save Access Configuration' : 'No Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
