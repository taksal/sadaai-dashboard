'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ModernSelectOption {
  value: string;
  label: string;
}

interface ModernSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ModernSelectOption[];
  className?: string;
  placeholder?: string;
}

export function ModernSelect({
  value,
  onChange,
  options,
  className = '',
  placeholder = 'Select...'
}: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`${className}`} ref={containerRef} style={{ minWidth: '180px', position: 'relative' }}>
      {/* Unified dropdown container that expands smoothly */}
      <div
        className="bg-white transition-all duration-300 ease-out"
        style={{
          borderRadius: isOpen ? '24px 24px 0 0' : '24px',
          boxShadow: isOpen ? '0 4px 16px rgba(0, 0, 0, 0.15)' : 'none',
          position: 'relative',
          zIndex: isOpen ? 50 : 1,
          width: '100%',
          overflow: 'visible'
        }}
      >
        {/* Always visible button - fixed height */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-secondary btn-sm h-9 px-4 text-xs font-medium inline-flex items-center justify-between gap-2 w-full border-0"
          style={{
            background: 'transparent',
            position: 'relative',
            zIndex: 2,
            minHeight: '36px'
          }}
        >
          <span className="truncate">{selectedOption?.label || placeholder}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Options that expand below with smooth transition */}
        <div
          className="transition-all duration-300 ease-out"
          style={{
            maxHeight: isOpen ? `${options.length * 42}px` : '0px',
            opacity: isOpen ? 1 : 0,
            overflow: 'hidden',
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1,
            background: 'white',
            borderRadius: '0 0 24px 24px',
            boxShadow: isOpen ? '0 4px 16px rgba(0, 0, 0, 0.15)' : 'none'
          }}
        >
          <div className="border-t border-border">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                  option.value === value
                    ? 'text-white'
                    : 'text-foreground hover:bg-gray-50'
                }`}
                style={option.value === value ? { background: 'var(--color-primary)' } : {}}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
