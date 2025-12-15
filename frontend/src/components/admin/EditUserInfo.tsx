'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Building2, Mail, Save } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  companyName?: string;
}

interface EditUserInfoProps {
  user: User;
  onUpdate: () => void;
}

export function EditUserInfo({ user, onUpdate }: EditUserInfoProps) {
  const { toast } = useToast();
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

  const handleSave = () => {
    updateUserMutation.mutate();
  };

  const hasChanges =
    formData.name !== user.name ||
    formData.email !== user.email ||
    formData.companyName !== (user.companyName || '');

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Edit User Information
        </CardTitle>
        <CardDescription>
          Update basic user details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Name
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter user name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Name
            </Label>
            <Input
              id="edit-company"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Enter company name (optional)"
              className="mt-1"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={updateUserMutation.isPending || !hasChanges}
              className="flex-1"
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
            >
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
