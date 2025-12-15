'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfigureAssistant } from './ConfigureAssistant';
import { CallPlan } from './CallPlan';
import { Actions } from './Actions';
import { AppAccess } from './AppAccess';
import { Billing } from './Billing';
import { EditUserInfo } from './EditUserInfo';

interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  role: string;
  isActive: boolean;
  pricePerMinute?: number;
  monthlyCharge?: number;
  billingCycle?: string;
  includedMinutes?: number;
  overageRate?: number;
  billingResetDay?: number;
  vapiAssistantId?: string;
  appAccess?: string[];
  createdAt: string;
}

interface UserRowExpandedProps {
  user: User;
  onUpdate: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function UserRowExpanded({ user, onUpdate, isExpanded }: UserRowExpandedProps) {
  if (user.role === 'ADMIN') {
    return null; // Don't show expanded options for admin users
  }

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="animate-in fade-in duration-300">
      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="w-full flex flex-wrap justify-start gap-2 bg-transparent border-b border-border pb-3 rounded-none">
          <TabsTrigger
            value="actions"
            className="h-8 text-xs md:text-sm rounded-pill data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#540D9B] data-[state=active]:to-[#004769] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Actions & Info
          </TabsTrigger>
          <TabsTrigger
            value="assistant"
            className="h-8 text-xs md:text-sm rounded-pill data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#540D9B] data-[state=active]:to-[#004769] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Assistant
          </TabsTrigger>
          <TabsTrigger
            value="plan"
            className="h-8 text-xs md:text-sm rounded-pill data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#540D9B] data-[state=active]:to-[#004769] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Call Plan
          </TabsTrigger>
          <TabsTrigger
            value="access"
            className="h-8 text-xs md:text-sm rounded-pill data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#540D9B] data-[state=active]:to-[#004769] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            App Access
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="h-8 text-xs md:text-sm rounded-pill data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#540D9B] data-[state=active]:to-[#004769] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Billing
          </TabsTrigger>
        </TabsList>

        <div className="py-4">
          <TabsContent value="actions" className="mt-0">
            <Actions user={user} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="assistant" className="mt-0">
            <ConfigureAssistant user={user} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="plan" className="mt-0">
            <CallPlan user={user} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="access" className="mt-0">
            <AppAccess user={user} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="billing" className="mt-0">
            <Billing user={user} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
