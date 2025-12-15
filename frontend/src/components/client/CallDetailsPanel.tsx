'use client';

import { useState, useEffect } from 'react';
import { Call } from '@/types';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { X, Download, Music, FileText, MessageSquare, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { UserRole } from '@/types';

interface CallDetailsPanelProps {
  selectedCall: Call | null;
  isOpen: boolean;
  onClose: () => void;
  calls: Call[];
  onNavigate: (call: Call) => void;
}

export function CallDetailsPanel({ selectedCall, isOpen, onClose, calls, onNavigate }: CallDetailsPanelProps) {
  const { user } = useAuthUser({ requiredRole: UserRole.CLIENT });
  const [panelWidth, setPanelWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if user has access to call recording feature
  const hasRecordingAccess = user?.appAccess?.includes('call_recording') ?? false;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNextCall = () => {
    if (!selectedCall || calls.length === 0) return;
    const currentIndex = calls.findIndex(call => call.id === selectedCall.id);
    if (currentIndex < calls.length - 1) {
      onNavigate(calls[currentIndex + 1]);
    }
  };

  const handlePreviousCall = () => {
    if (!selectedCall || calls.length === 0) return;
    const currentIndex = calls.findIndex(call => call.id === selectedCall.id);
    if (currentIndex > 0) {
      onNavigate(calls[currentIndex - 1]);
    }
  };

  const getCurrentCallIndex = () => {
    if (!selectedCall || calls.length === 0) return { current: 0, total: 0 };
    const currentIndex = calls.findIndex(call => call.id === selectedCall.id);
    return { current: currentIndex + 1, total: calls.length };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || isMobile) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(400, Math.min(newWidth, window.innerWidth - 100)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing && !isMobile) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, isMobile]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Higher z-index to overlay header */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-background border-l shadow-2xl z-[70] flex transition-transform duration-300 ease-out ${
          isMobile ? 'w-full' : ''
        }`}
        style={isMobile ? undefined : { width: `${panelWidth}px` }}
      >
        {/* Resize Handle - Hidden on mobile */}
        {!isMobile && (
          <div
            className="w-2 bg-border/50 hover:bg-primary/20 cursor-ew-resize transition-all flex-shrink-0 flex items-center justify-center group"
            onMouseDown={() => setIsResizing(true)}
          >
            <GripVertical className="h-5 w-5 text-black dark:text-white group-hover:text-primary transition-colors" />
          </div>
        )}

        {/* Panel Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-base md:text-lg font-semibold truncate">Call Details</h2>
                {selectedCall && (
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                    {selectedCall.callId}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 md:gap-2 ml-2">
                {/* Navigation Controls */}
                <div className="hidden sm:flex items-center gap-1 mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousCall}
                    disabled={getCurrentCallIndex().current <= 1}
                    className="h-8 w-8"
                    title="Previous call"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2 min-w-[60px] text-center">
                    {getCurrentCallIndex().current} / {getCurrentCallIndex().total}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextCall}
                    disabled={getCurrentCallIndex().current >= getCurrentCallIndex().total}
                    className="h-8 w-8"
                    title="Next call"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                {/* Mobile Navigation */}
                <div className="flex sm:hidden items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousCall}
                    disabled={getCurrentCallIndex().current <= 1}
                    className="h-7 w-7"
                    title="Previous"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextCall}
                    disabled={getCurrentCallIndex().current >= getCurrentCallIndex().total}
                    className="h-7 w-7"
                    title="Next"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-7 w-7 md:h-8 md:w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          {selectedCall && (
            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
              {/* Recording Section - Only show if user has access */}
              {hasRecordingAccess && selectedCall.recordingUrl && (
                <div className="bg-muted/50 rounded-xl p-3 md:p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Music className="h-3.5 w-3.5 text-purple-600" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Recording
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedCall.recordingUrl!;
                        link.download = `call-${selectedCall.callId}.mp3`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="h-3.5 w-3.5 md:mr-1.5" />
                      <span className="hidden md:inline">Download</span>
                    </Button>
                  </div>
                  <audio
                    controls
                    className="w-full"
                    style={{ height: '40px' }}
                  >
                    <source src={selectedCall.recordingUrl} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Call Information - Compact Grid */}
              <div className="bg-muted/30 rounded-xl p-3 md:p-4 border">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Call Information
                  </p>
                </div>

                <div className="space-y-2">
                  {/* Row 1: Customer Phone & Status - Stack on mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 py-1.5 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Customer Phone</span>
                      <span className="text-xs sm:text-sm font-semibold">{selectedCall.customerPhone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedCall.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        selectedCall.status === 'TRANSFERRED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {selectedCall.status}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Start Time & Duration - Stack on mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 py-1.5 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Start Time</span>
                      <span className="text-xs font-medium">{new Date(selectedCall.startTime).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Duration</span>
                      <span className="text-xs sm:text-sm font-semibold">{formatDuration(selectedCall.duration)}</span>
                    </div>
                  </div>

                  {/* Row 3: End Time & Cost - Stack on mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 py-1.5 border-b border-border/30">
                    {selectedCall.endTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">End Time</span>
                        <span className="text-xs font-medium">{new Date(selectedCall.endTime).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Cost</span>
                      <span className="text-xs sm:text-sm font-semibold">{formatCurrency(selectedCall.cost)}</span>
                    </div>
                  </div>

                  {/* Row 4: End Reason - Full Width at Bottom */}
                  {selectedCall.endReason && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 bg-gradient-to-r from-[#FF8008] to-[#FFC837] rounded-lg border border-orange-300/50 gap-1">
                      <span className="text-xs font-medium text-white">End Reason</span>
                      <span className="text-xs font-semibold text-white break-words">{selectedCall.endReason}</span>
                    </div>
                  )}

                  {/* Row 5: Transferred To - Full Width */}
                  {selectedCall.transferredTo && (
                    <div className="flex items-center justify-between py-1.5 border-t border-border/30">
                      <span className="text-xs text-muted-foreground">Transferred To</span>
                      <span className="text-xs font-medium">{selectedCall.transferredTo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Section */}
              {selectedCall.summary && (
                <div className="bg-muted/30 rounded-lg p-3 md:p-5 border">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-3.5 w-3.5 text-green-600" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Summary
                    </p>
                  </div>
                  <p className="text-xs md:text-sm leading-relaxed">{selectedCall.summary}</p>
                </div>
              )}

              {/* Transcript Section - CLI Style */}
              {selectedCall.transcript && (
                <div className="bg-slate-950 dark:bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                  <div className="bg-slate-900 dark:bg-slate-800 px-3 md:px-4 py-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                      <p className="text-xs font-medium text-slate-400">
                        Transcript
                      </p>
                    </div>
                  </div>
                  <div className="p-3 md:p-5 max-h-80 md:max-h-96 overflow-y-auto">
                    <pre className="text-xs md:text-sm leading-relaxed text-green-400 font-mono whitespace-pre-wrap break-words">
                      {selectedCall.transcript}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
