'use client';

import { useState, useEffect } from 'react';
import { ModernSelect } from '@/components/common/ModernSelect';
import { Bot } from 'lucide-react';

interface Assistant {
  id: string;
  name: string;
}

interface AssistantSelectorProps {
  assistants: Assistant[];
  selectedAssistantId: string | null;
  onSelectAssistant: (assistantId: string) => void;
  className?: string;
}

export function AssistantSelector({
  assistants,
  selectedAssistantId,
  onSelectAssistant,
  className = '',
}: AssistantSelectorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't show selector if there's only one assistant
  if (!mounted || assistants.length <= 1) {
    return null;
  }

  const options = assistants.map((assistant) => ({
    value: assistant.id,
    label: assistant.name,
  }));

  // Add "All Assistants" option
  const allOptions = [
    { value: 'all', label: 'All Assistants' },
    ...options,
  ];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground">Assistant:</span>
      </div>
      <ModernSelect
        value={selectedAssistantId || 'all'}
        onChange={onSelectAssistant}
        options={allOptions}
        placeholder="Select assistant"
      />
    </div>
  );
}
