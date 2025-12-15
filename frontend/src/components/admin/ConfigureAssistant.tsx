'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2, RefreshCw, X, Copy, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface User {
  id: string;
  name: string;
  vapiAssistantId?: string;
  vapiAssistants?: Array<{ id: string; name: string }>;
  vapiApiKey?: string;
  vapiOrgId?: string;
}

interface ConfigureAssistantProps {
  user: User;
  onUpdate: () => void;
}

interface VapiAssistant {
  id: string;
  name: string;
  model?: {
    provider?: string;
    model?: string;
  };
  voice?: {
    provider?: string;
    voiceId?: string;
  };
}

export function ConfigureAssistant({ user, onUpdate }: ConfigureAssistantProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [selectedAssistants, setSelectedAssistants] = useState<string[]>([]);
  const [assistantNames, setAssistantNames] = useState<Record<string, string>>({});
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    assistantId: string;
    assistantName: string;
  }>({ open: false, assistantId: '', assistantName: '' });

  // Fetch VAPI assistants
  const { data: assistants, isLoading: loadingAssistants, refetch } = useQuery<VapiAssistant[]>({
    queryKey: ['vapi-assistants', apiKey, organizationId],
    queryFn: async () => {
      if (!apiKey) return [];

      try {
        const response = await api.post('/vapi/list-assistants', {
          apiKey,
          organizationId,
        });
        return response.data;
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch VAPI assistants. Check your credentials.',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: credentialsSaved && !!apiKey,
  });

  // Build assistant names map when assistants are loaded
  useEffect(() => {
    if (assistants && assistants.length > 0) {
      const names: Record<string, string> = {};
      assistants.forEach((assistant) => {
        names[assistant.id] = assistant.name;
      });
      setAssistantNames(names);
    }
  }, [assistants]);

  // Initialize selected assistants, names, and credentials from user data
  useEffect(() => {
    // Load saved credentials
    if (user.vapiApiKey) {
      setApiKey(user.vapiApiKey);
      setCredentialsSaved(true);
    }
    if (user.vapiOrgId) {
      setOrganizationId(user.vapiOrgId);
    }

    // First try to use vapiAssistants (new format with names)
    if (user.vapiAssistants && Array.isArray(user.vapiAssistants)) {
      const ids = user.vapiAssistants.map((a: any) => a.id);
      setSelectedAssistants(ids);

      // Build names map from stored data
      const names: Record<string, string> = {};
      user.vapiAssistants.forEach((a: any) => {
        names[a.id] = a.name;
      });
      setAssistantNames(names);
    }
    // Fall back to old format (vapiAssistantId only)
    else if (user.vapiAssistantId) {
      try {
        const ids = JSON.parse(user.vapiAssistantId);
        setSelectedAssistants(Array.isArray(ids) ? ids : [ids]);
      } catch {
        setSelectedAssistants([user.vapiAssistantId]);
      }
    }
  }, [user.vapiAssistantId, user.vapiAssistants, user.vapiApiKey, user.vapiOrgId]);

  const saveCredentials = () => {
    if (!apiKey) {
      toast({
        title: 'Error',
        description: 'Please enter VAPI API Key',
        variant: 'destructive',
      });
      return;
    }
    setCredentialsSaved(true);
    toast({
      title: 'Success',
      description: 'Credentials saved. Loading assistants...',
    });
  };

  const updateAssistantsMutation = useMutation({
    mutationFn: async () => {
      // Build array of {id, name} objects
      const assistantsWithNames = selectedAssistants.map(id => ({
        id,
        name: assistantNames[id] || 'Unknown',
      }));

      const payload = {
        vapiAssistantId: JSON.stringify(selectedAssistants),
        vapiAssistants: assistantsWithNames,
        vapiApiKey: apiKey || undefined,
        vapiOrgId: organizationId || undefined,
      };
      const response = await api.patch(`/users/${user.id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Assistant configuration updated successfully',
      });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update assistant configuration',
        variant: 'destructive',
      });
    },
  });

  const handleToggleAssistant = (assistantId: string) => {
    setSelectedAssistants((prev) =>
      prev.includes(assistantId)
        ? prev.filter((id) => id !== assistantId)
        : [...prev, assistantId]
    );
  };

  const handleRemoveClick = (assistantId: string) => {
    const assistantName = assistantNames[assistantId] || 'this assistant';
    setConfirmDialog({
      open: true,
      assistantId,
      assistantName,
    });
  };

  const handleConfirmRemove = async () => {
    const assistantId = confirmDialog.assistantId;
    const newAssistants = selectedAssistants.filter((id) => id !== assistantId);
    setSelectedAssistants(newAssistants);
    setConfirmDialog({ open: false, assistantId: '', assistantName: '' });

    // Immediately save the change
    try {
      // Build array of {id, name} objects for remaining assistants
      const assistantsWithNames = newAssistants.map(id => ({
        id,
        name: assistantNames[id] || 'Unknown',
      }));

      await api.patch(`/users/${user.id}`, {
        vapiAssistantId: JSON.stringify(newAssistants),
        vapiAssistants: assistantsWithNames,
      });
      toast({
        title: 'Success',
        description: 'Assistant removed successfully',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove assistant',
        variant: 'destructive',
      });
      // Revert on error
      setSelectedAssistants(selectedAssistants);
    }
  };

  const handleSave = () => {
    if (selectedAssistants.length === 0) {
      toast({
        title: 'Warning',
        description: 'Please select at least one assistant',
        variant: 'destructive',
      });
      return;
    }
    updateAssistantsMutation.mutate();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const downloadAssistants = () => {
    const data = selectedAssistants.map(id => ({
      id,
      name: assistantNames[id] || 'Unknown'
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.name}-assistants.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Downloaded!',
      description: 'Assistant list downloaded successfully',
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: VAPI Configuration */}
      <div className="card flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm md:text-base text-foreground">VAPI Configuration</h3>
          <p className="text-xs text-muted-foreground mt-1">Enter credentials to load assistants</p>
        </div>

        <div className="flex-1 p-4 space-y-3">
          <div>
            <Label htmlFor="api-key" className="text-sm font-medium">Private API Key</Label>
            <Input
              id="api-key"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter VAPI API Key"
              className="mt-2 h-10 text-sm rounded-pill"
            />
          </div>

          <div>
            <Label htmlFor="org-id" className="text-sm font-medium">Organization ID (Optional)</Label>
            <Input
              id="org-id"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="Enter Organization ID"
              className="mt-2 h-10 text-sm rounded-pill"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={saveCredentials}
              disabled={!apiKey || loadingAssistants}
              className="flex-1 h-10 text-sm bg-gradient-to-r from-[#540D9B] to-[#004769] hover:opacity-90 rounded-pill"
            >
              {loadingAssistants ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load Assistants'
              )}
            </Button>
            {credentialsSaved && (
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="h-10 px-4 border-primary text-primary hover:bg-primary/10 rounded-pill"
                disabled={loadingAssistants}
              >
                <RefreshCw className={`h-4 w-4 ${loadingAssistants ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>

          {/* Available Assistants List */}
          {credentialsSaved && (
            <div className="border-t border-border pt-4 mt-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs md:text-sm font-semibold text-foreground">Available Assistants</h4>
                {assistants && assistants.length > 0 && (
                  <Button
                    onClick={handleSave}
                    disabled={updateAssistantsMutation.isPending || selectedAssistants.length === 0}
                    size="sm"
                    className="h-9 text-sm px-4 bg-gradient-to-r from-[#540D9B] to-[#004769] hover:opacity-90 rounded-pill"
                  >
                    {updateAssistantsMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-3">
                {loadingAssistants ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="mt-3 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : assistants && assistants.length > 0 ? (
                  assistants.map((assistant) => (
                    <div
                      key={assistant.id}
                      className={`flex items-start gap-3 p-3.5 rounded-card border-2 transition-all cursor-pointer ${
                        selectedAssistants.includes(assistant.id)
                          ? 'border-[#540D9B] bg-gradient-to-br from-[#540D9B]/5 to-[#004769]/5 shadow-sm'
                          : 'border-border hover:border-[#540D9B]/30 bg-white hover:shadow-sm'
                      }`}
                      onClick={() => handleToggleAssistant(assistant.id)}
                    >
                      <Checkbox
                        checked={selectedAssistants.includes(assistant.id)}
                        onCheckedChange={() => handleToggleAssistant(assistant.id)}
                        className="mt-1 data-[state=checked]:bg-[#540D9B] data-[state=checked]:border-[#540D9B]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Bot className="h-4 w-4 text-[#540D9B] flex-shrink-0" />
                          <span className="font-semibold text-sm text-foreground truncate">{assistant.name}</span>
                        </div>
                        <code className="text-xs text-muted-foreground truncate block">
                          {assistant.id}
                        </code>
                        {(assistant.model || assistant.voice) && (
                          <div className="flex gap-2 mt-2">
                            {assistant.model && (
                              <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded-pill font-medium">
                                {assistant.model.model}
                              </span>
                            )}
                            {assistant.voice && (
                              <span className="text-[10px] px-2 py-1 bg-purple-50 text-purple-700 rounded-pill font-medium">
                                {assistant.voice.provider}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bot className="h-6 w-6 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No assistants found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Assigned Assistants */}
      <div className="card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm md:text-base text-foreground">Assigned Assistants</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedAssistants.length} assistant{selectedAssistants.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
            {selectedAssistants.length > 0 && (
              <Button
                onClick={downloadAssistants}
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-pill hover:bg-primary/10"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedAssistants.length > 0 ? (
            <div className="space-y-3">
              {selectedAssistants.map((assistantId) => (
                <div key={assistantId} className="flex items-center justify-between p-4 bg-white rounded-card border border-border hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2.5 bg-gradient-to-br from-[#540D9B]/10 to-[#004769]/10 rounded-xl flex-shrink-0">
                      <Bot className="h-5 w-5 text-[#540D9B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {assistantNames[assistantId] || 'Loading...'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-muted-foreground truncate block max-w-[220px]">
                          {assistantId}
                        </code>
                        <button
                          onClick={() => copyToClipboard(assistantId, 'Assistant ID')}
                          className="p-1 hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5 text-[#540D9B]" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveClick(assistantId)}
                    className="ml-3 p-2 hover:bg-red-50 rounded-xl transition-colors group/remove"
                  >
                    <X className="h-4 w-4 text-muted-foreground group-hover/remove:text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">No assistants assigned</p>
              <p className="text-sm text-muted-foreground mt-2">Load and select assistants from the left panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
        title="Remove Assistant"
        description={`Are you sure you want to remove "${confirmDialog.assistantName}" from ${user.name}? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemove}
        variant="destructive"
      />
    </div>
  );
}
