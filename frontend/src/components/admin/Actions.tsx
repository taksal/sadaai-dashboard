'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  LogOut,
  Power,
  KeyRound,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Building2,
  Save,
  Shield
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { triggerForceLogout } from '@/lib/forceLogout';

interface User {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  isActive: boolean;
}

interface ActionsProps {
  user: User;
  onUpdate: () => void;
}

export function Actions({ user, onUpdate }: ActionsProps) {
  const { toast } = useToast();
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isForceLogoutOpen, setIsForceLogoutOpen] = useState(false);
  const [isToggleActiveOpen, setIsToggleActiveOpen] = useState(false);
  const [isViewDashboardOpen, setIsViewDashboardOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Edit user info state
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    companyName: user.companyName || '',
  });

  // Update User Info Mutation
  const updateUserMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/users/${user.id}`, formData);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User information updated successfully',
      });
      onUpdate();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update user information',
        variant: 'destructive',
      });
    },
  });

  // Force Logout Mutation
  const forceLogoutMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/users/${user.id}/force-logout`);
      triggerForceLogout();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `${user.name} has been logged out from all devices`,
      });
      setIsForceLogoutOpen(false);
      onUpdate();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to force logout user',
        variant: 'destructive',
      });
    },
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/users/${user.id}/password`, {
        newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password reset successfully',
      });
      setIsResetPasswordOpen(false);
      setNewPassword('');
      onUpdate();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reset password',
        variant: 'destructive',
      });
    },
  });

  // Toggle Active Status Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/users/${user.id}`, {
        isActive: !user.isActive,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `User ${!user.isActive ? 'activated' : 'deactivated'} successfully`,
      });
      setIsToggleActiveOpen(false);
      onUpdate();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    },
  });

  const handleSaveUserInfo = () => {
    // Validate required fields
    if (!formData.companyName || !formData.name || !formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Company Name, Name, and Email are required fields',
        variant: 'destructive',
      });
      return;
    }
    updateUserMutation.mutate();
  };

  const handleViewDashboard = () => {
    setIsViewDashboardOpen(true);
  };

  const hasChanges =
    formData.name !== user.name ||
    formData.email !== user.email ||
    formData.companyName !== (user.companyName || '');

  return (
    <div className="space-y-5">
      {/* Status Banner */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-pill ${user.isActive ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {user.isActive ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
        )}
        <span className={`text-sm font-medium ${user.isActive ? 'text-green-800' : 'text-red-800'}`}>
          Account Status: <strong>{user.isActive ? 'ACTIVE' : 'INACTIVE'}</strong>
        </span>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left Column - Edit User Information */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-card p-5 border border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">User Information</h3>
              <p className="text-xs text-muted-foreground">Update basic user details</p>
            </div>
          </div>
          <div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-company" className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Company Name <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="edit-company"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Enter company name"
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-name" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Contact Person Name <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter contact person name"
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-email" className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  className="mt-1.5"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveUserInfo}
                  disabled={updateUserMutation.isPending || !hasChanges}
                  className="flex-1 rounded-pill"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setFormData({
                    name: user.name || '',
                    email: user.email || '',
                    companyName: user.companyName || '',
                  })}
                  disabled={!hasChanges}
                  size="sm"
                  className="rounded-pill"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>

          {/* Force Logout */}
          <div className="flex items-center justify-between p-3 bg-background rounded-card border border-border hover:shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <LogOut className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Force Logout</h4>
                <p className="text-xs text-muted-foreground">Sign out from all devices</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-pill border-orange-300 hover:bg-orange-50 text-orange-700"
              onClick={() => setIsForceLogoutOpen(true)}
            >
              Logout
            </Button>
          </div>

          {/* Toggle Active Status */}
          <div className={`flex items-center justify-between p-3 bg-background rounded-card border hover:shadow-sm transition-all ${user.isActive ? 'border-red-200' : 'border-green-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${user.isActive ? 'bg-red-100' : 'bg-green-100'}`}>
                <Power className={`h-4 w-4 ${user.isActive ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div>
                <h4 className="font-semibold text-sm">{user.isActive ? 'Deactivate' : 'Activate'} Account</h4>
                <p className="text-xs text-muted-foreground">{user.isActive ? 'Disable access' : 'Enable access'}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={`rounded-pill ${user.isActive ? 'border-red-300 hover:bg-red-50 text-red-700' : 'border-green-300 hover:bg-green-50 text-green-700'}`}
              onClick={() => setIsToggleActiveOpen(true)}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>

          {/* Reset Password */}
          <div className="flex items-center justify-between p-3 bg-background rounded-card border border-border hover:shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <KeyRound className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Reset Password</h4>
                <p className="text-xs text-muted-foreground">Set a new password</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-pill border-blue-300 hover:bg-blue-50 text-blue-700"
              onClick={() => setIsResetPasswordOpen(true)}
            >
              Reset
            </Button>
          </div>

          {/* View Dashboard */}
          <div className="flex items-center justify-between p-3 bg-background rounded-card border border-border hover:shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">View Dashboard</h4>
                <p className="text-xs text-muted-foreground">Open user's dashboard</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-pill border-purple-300 hover:bg-purple-50 text-purple-700"
              onClick={handleViewDashboard}
            >
              View
            </Button>
          </div>
        </div>
      </div>

      {/* Force Logout Dialog */}
      <Dialog open={isForceLogoutOpen} onOpenChange={setIsForceLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-orange-600" />
              Force Logout User
            </DialogTitle>
            <DialogDescription>
              This will sign out <strong>{user.name}</strong> from all devices immediately.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. The user will be logged out immediately.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsForceLogoutOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => forceLogoutMutation.mutate()}
              disabled={forceLogoutMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {forceLogoutMutation.isPending ? 'Logging out...' : 'Force Logout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Active Status Dialog */}
      <Dialog open={isToggleActiveOpen} onOpenChange={setIsToggleActiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className={`h-5 w-5 ${user.isActive ? 'text-red-600' : 'text-green-600'}`} />
              {user.isActive ? 'Deactivate' : 'Activate'} User Account
            </DialogTitle>
            <DialogDescription>
              {user.isActive ? (
                <>This will <strong>deactivate</strong> {user.name}'s account.</>
              ) : (
                <>This will <strong>activate</strong> {user.name}'s account.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <Alert className={user.isActive ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
            <AlertCircle className={`h-4 w-4 ${user.isActive ? 'text-red-600' : 'text-green-600'}`} />
            <AlertDescription className={user.isActive ? 'text-red-800' : 'text-green-800'}>
              {user.isActive
                ? 'Deactivated users cannot log in or access their dashboard.'
                : 'Activated users can log in and access their dashboard.'
              }
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsToggleActiveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => toggleActiveMutation.mutate()}
              disabled={toggleActiveMutation.isPending}
              className={user.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {toggleActiveMutation.isPending
                ? 'Processing...'
                : user.isActive ? 'Deactivate User' : 'Activate User'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{user.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 6 characters recommended
              </p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The user will not be notified of this password change.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsResetPasswordOpen(false);
              setNewPassword('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => resetPasswordMutation.mutate()}
              disabled={resetPasswordMutation.isPending || !newPassword || newPassword.length < 6}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dashboard Dialog */}
      <Dialog open={isViewDashboardOpen} onOpenChange={setIsViewDashboardOpen}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              {user.name}'s Dashboard (Read-Only View)
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6">
            <iframe
              src={`/client?view_as=${user.id}`}
              className="w-full h-full border rounded-lg"
              title={`${user.name}'s Dashboard`}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
