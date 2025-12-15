'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Calendar, TrendingUp, Save, Clock, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  name: string;
  email: string;
}

interface BillingProps {
  user: User;
}

interface BillingHistoryRecord {
  id: string;
  billingMonth: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalMinutes: number;
  includedMinutes: number;
  overageMinutes: number;
  monthlyCharge: number;
  overageCharge: number;
  totalCharge: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface CurrentBill {
  billableMinutes: number;
  includedMinutes: number;
  overageMinutes: number;
  overageCharge: number;
  monthlyCharge: number;
  totalMonthlyBill: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

interface BillingData {
  currentBill: CurrentBill;
  history: BillingHistoryRecord[];
}

export function Billing({ user }: BillingProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Fetch billing history
  const { data, isLoading, refetch } = useQuery<BillingData>({
    queryKey: ['billing-history', user.id],
    queryFn: async () => {
      const response = await api.get(`/users/billing-history/${user.id}`);
      return response.data;
    },
  });

  // Save current billing mutation
  const saveBillingMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/users/${user.id}/save-billing`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Current billing period has been saved to history',
      });
      refetch();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save billing history',
        variant: 'destructive',
      });
    },
  });

  // Update billing status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ billingId, status }: { billingId: string; status: string }) => {
      await api.patch(`/users/billing-history/${billingId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Billing status updated successfully',
      });
      refetch();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update billing status',
        variant: 'destructive',
      });
    },
  });

  // Delete billing history mutation
  const deleteMutation = useMutation({
    mutationFn: async (billingId: string) => {
      await api.delete(`/users/billing-history/${billingId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Billing record deleted successfully',
      });
      refetch();
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete billing record',
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (billingId: string, newStatus: string) => {
    updateStatusMutation.mutate({ billingId, status: newStatus });
  };

  const handleDeleteClick = (billingId: string) => {
    setRecordToDelete(billingId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (recordToDelete) {
      deleteMutation.mutate(recordToDelete);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading billing data...</p>
        </div>
      </div>
    );
  }

  const currentBill = data?.currentBill;
  const history = data?.history || [];

  return (
    <div className="space-y-4">
      {/* Current Billing Period */}
      <div className="card border-l-4 border-l-blue-500">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                Current Billing Period
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {currentBill && (
                  <>
                    {formatDate(currentBill.billingPeriodStart)} - {formatDate(currentBill.billingPeriodEnd)}
                  </>
                )}
              </p>
            </div>
            <Button
              onClick={() => saveBillingMutation.mutate()}
              disabled={saveBillingMutation.isPending}
              className="h-10 px-6 bg-gradient-to-r from-[#540D9B] to-[#004769] hover:opacity-90 rounded-pill"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveBillingMutation.isPending ? 'Saving...' : 'Save to History'}
            </Button>
          </div>
        </div>
        <div className="p-4">
          {currentBill && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-card border border-blue-200">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Total Minutes</p>
                  <p className="text-lg font-bold text-foreground">{currentBill.billableMinutes}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-card border border-green-200">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Included</p>
                  <p className="text-lg font-bold text-foreground">{currentBill.includedMinutes}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-card border border-orange-200">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Overage</p>
                  <p className="text-lg font-bold text-foreground">{currentBill.overageMinutes}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-card border border-primary/20">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Total Bill</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(currentBill.totalMonthlyBill)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm md:text-base text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Billing History
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Past billing periods and charges
          </p>
        </div>
        <div className="p-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">No billing history yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Save current period to create history
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Period</TableHead>
                      <TableHead className="text-xs font-semibold">Dates</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Total Min</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Included</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Overage</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Monthly</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Overage $</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Total</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm">
                              {new Date(record.billingMonth + '-01').toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(record.billingPeriodStart)} - {formatDate(record.billingPeriodEnd)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">{record.totalMinutes}</TableCell>
                        <TableCell className="text-right text-sm">{record.includedMinutes}</TableCell>
                        <TableCell className="text-right">
                          {record.overageMinutes > 0 ? (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-pill text-xs font-semibold">{record.overageMinutes}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(record.monthlyCharge)}</TableCell>
                        <TableCell className="text-right">
                          {record.overageCharge > 0 ? (
                            <span className="text-orange-600 font-semibold text-sm">{formatCurrency(record.overageCharge)}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-primary">
                          {formatCurrency(record.totalCharge)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={record.status}
                            onValueChange={(value) => handleStatusChange(record.id, value)}
                          >
                            <SelectTrigger className="w-32 h-9 rounded-pill border-0">
                              <SelectValue>
                                <span
                                  className={`px-3 py-1.5 rounded-pill text-xs font-semibold ${
                                    record.status === 'paid'
                                      ? 'bg-green-100 text-green-800'
                                      : record.status === 'overdue'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-card">
                              <SelectItem value="pending" className="rounded-pill">Pending</SelectItem>
                              <SelectItem value="paid" className="rounded-pill">Paid</SelectItem>
                              <SelectItem value="overdue" className="rounded-pill">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(record.id)}
                            className="h-9 w-9 p-0 rounded-full hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this billing history record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-pill">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 rounded-pill"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
