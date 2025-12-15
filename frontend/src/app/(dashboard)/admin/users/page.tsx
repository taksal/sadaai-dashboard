'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ModernSelect } from '@/components/common/ModernSelect';
import { Plus, Trash2, ChevronRight, Copy, Check, Mail, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRowExpanded } from '@/components/admin/UserRowExpanded';

interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  role: string;
  isActive: boolean;
  pricePerMinute?: number;
  monthlyCharge?: number;
  vapiAssistantId?: string;
  appAccess?: string[];
  createdAt: string;
  includedMinutes?: number;
  overageRate?: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const copyToClipboard = (text: string, type: 'id' | 'email', userId: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedEmail(userId);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
    toast({
      title: 'Copied!',
      description: `${type === 'id' ? 'Client ID' : 'Email'} copied to clipboard`,
    });
  };

  // Prevent body scroll when user is expanded
  useEffect(() => {
    if (expandedUserId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [expandedUserId]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    companyName: '',
    role: 'CLIENT',
    isActive: true,
    pricePerMinute: 0.10,
    monthlyCharge: 50.00,
    mustChangePassword: false,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/users', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create user',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      companyName: '',
      role: 'CLIENT',
      isActive: true,
      pricePerMinute: 0.10,
      monthlyCharge: 50.00,
      mustChangePassword: false,
    });
  };

  const handleCreate = () => {
    // Validate required fields
    if (!formData.companyName || !formData.name || !formData.email || !formData.password) {
      toast({
        title: 'Validation Error',
        description: 'Company Name, Name, Email, and Password are required fields',
        variant: 'destructive',
      });
      return;
    }

    // Prepare data - include isActive if explicitly set
    const createData = {
      ...formData,
      ...(formData.isActive !== undefined ? { isActive: formData.isActive } : {})
    };

    createMutation.mutate(createData);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  if (!user) return null;

  return (
    <DashboardLayout userRole={UserRole.ADMIN} user={user}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gradient-primary-horizontal">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client accounts and configurations</p>
        </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="rounded-pill shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-card">
              <DialogHeader className="pb-4 border-b border-border">
                <DialogTitle className="text-xl font-bold text-foreground">Create New User</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Add a new user to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="create-company" className="text-sm font-medium">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="create-company"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Enter company name"
                    className="h-10 rounded-pill"
                    required
                  />
                </div>

                {/* Contact Person Name */}
                <div className="space-y-2">
                  <Label htmlFor="create-name" className="text-sm font-medium">
                    Contact Person <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter contact person name"
                    className="h-10 rounded-pill"
                    required
                  />
                </div>

                {/* Email & Password Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-email" className="text-sm font-medium">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="create-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className="h-10 rounded-pill"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-password" className="text-sm font-medium">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="create-password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      className="h-10 rounded-pill"
                      required
                    />
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="create-role" className="text-sm font-medium">Role</Label>
                  <ModernSelect
                    value={formData.role}
                    onChange={(value) => setFormData({ ...formData, role: value })}
                    options={[
                      { value: 'ADMIN', label: 'Admin' },
                      { value: 'CLIENT', label: 'Client' }
                    ]}
                    placeholder="Select role"
                  />
                </div>

                {/* Client-specific fields */}
                {formData.role === 'CLIENT' && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-primary/5 rounded-card border border-border space-y-3">
                    <p className="text-sm font-semibold text-foreground">Client Billing Information</p>
                    <div className="space-y-2">
                      <Label htmlFor="create-monthly" className="text-sm font-medium">Monthly Charge ($)</Label>
                      <Input
                        id="create-monthly"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.monthlyCharge}
                        onChange={(e) => setFormData({ ...formData, monthlyCharge: parseFloat(e.target.value) || 0 })}
                        placeholder="50.00"
                        className="h-10 rounded-pill"
                      />
                      <p className="text-xs text-muted-foreground">
                        Default monthly fee (can be customized later)
                      </p>
                    </div>
                  </div>
                )}

                {/* Active Status */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-card">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="create-active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="create-active" className="text-sm font-medium cursor-pointer">
                      Active User
                    </Label>
                  </div>
                  <span className={`pill ${formData.isActive ? 'pill-success' : 'pill-danger'}`}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Force Password Change */}
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-card border border-yellow-200">
                  <Checkbox
                    id="create-force-password"
                    checked={formData.mustChangePassword}
                    onCheckedChange={(checked) => setFormData({ ...formData, mustChangePassword: checked as boolean })}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="create-force-password" className="text-sm font-medium cursor-pointer text-foreground">
                      Force Password Change on First Login
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      User will be required to change their password when they log in for the first time
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 h-10 rounded-pill"
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    className="flex-1 h-10 rounded-pill bg-gradient-to-r from-[#540D9B] to-[#004769] hover:opacity-90"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create User
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-card border border-border overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            users?.sort((a, b) => {
              // Admins always on top
              if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
              if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
              // Then sort by company name
              return (a.companyName || '').localeCompare(b.companyName || '');
            }).map((userData) => (
              <div key={userData.id} className={expandedUserId === userData.id ? 'fixed inset-0 z-50 bg-background flex flex-col overflow-hidden' : ''}>
                {expandedUserId === userData.id && (
                  <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border">
                    {/* Compact Header when Expanded */}
                    <div className="flex items-center justify-between px-4 md:px-6 py-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedUserId(null)}
                          className="rounded-full h-8 w-8 p-0 flex-shrink-0"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                        </Button>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base md:text-lg text-foreground truncate">
                            {userData.companyName || 'No Company Name'}
                          </h3>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {userData.name} • {userData.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`pill text-xs ${userData.role === 'ADMIN' ? 'pill-info' : 'bg-blue-50 text-blue-700'}`}>
                          {userData.role}
                        </span>
                        <span className={`pill text-xs ${userData.isActive ? 'pill-success' : 'pill-danger'}`}>
                          {userData.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slim User Row - Hidden when expanded */}
                {expandedUserId !== userData.id && (
                  <div
                    className={`group relative flex items-center gap-4 px-4 py-3 border-b last:border-b-0 border-border hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:border-l-4 hover:border-l-orange-400 transition-all cursor-pointer ${
                      userData.role === 'ADMIN' ? 'cursor-default bg-gradient-to-r from-purple-50/50 to-indigo-50/50' : ''
                    }`}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('button') && userData.role !== 'ADMIN') {
                        setExpandedUserId(userData.id);
                      }
                    }}
                  >
                    {/* Company Name & Contact with Status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {userData.companyName || 'No Company Name'}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          userData.role === 'ADMIN' ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700' : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700'
                        }`}>
                          {userData.role}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          userData.isActive ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700'
                        }`}>
                          {userData.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{userData.name}</p>
                    </div>

                    {/* Client ID */}
                    <div className="hidden sm:flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-mono text-slate-600">{userData.id.substring(0, 8)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(userData.id, 'id', userData.id);
                        }}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        {copiedId === userData.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>
                    </div>

                    {/* Email */}
                    <div className="hidden md:flex items-center gap-2 max-w-[220px]">
                      <Mail className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-xs text-slate-600 truncate">{userData.email}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(userData.email, 'email', userData.id);
                        }}
                        className="p-1 hover:bg-blue-50 rounded transition-colors"
                      >
                        {copiedEmail === userData.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-blue-400 hover:text-blue-600" />
                        )}
                      </button>
                    </div>

                    {/* Pricing (for clients only) */}
                    {userData.role === 'CLIENT' && (
                      <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="text-center">
                          <p className="text-[9px] text-green-600 uppercase font-semibold">Monthly</p>
                          <p className="text-xs font-bold text-green-800">${userData.monthlyCharge?.toFixed(0)}</p>
                        </div>
                        <div className="h-7 w-px bg-green-300"></div>
                        <div className="text-center">
                          <p className="text-[9px] text-green-600 uppercase font-semibold">Minutes</p>
                          <p className="text-xs font-bold text-green-800">{userData.includedMinutes || 0}</p>
                        </div>
                        <div className="h-7 w-px bg-green-300"></div>
                        <div className="text-center">
                          <p className="text-[9px] text-green-600 uppercase font-semibold">Overage</p>
                          <p className="text-xs font-bold text-green-800">${(userData.overageRate || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {userData.role !== 'ADMIN' && (
                        <button
                          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-orange-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="h-4 w-4 text-orange-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(userData.id);
                        }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-500 hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Content - Full Screen with Scroll */}
                {expandedUserId === userData.id && (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 min-h-0">
                    <div className="max-w-7xl mx-auto">
                      <UserRowExpanded
                        user={userData}
                        onUpdate={handleUpdate}
                        isExpanded={true}
                        onToggle={() => setExpandedUserId(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
    </DashboardLayout>
  );
}
