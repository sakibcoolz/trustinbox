'use client';

import { useState, useRef, useEffect } from 'react';
import { Receipt, CreditCard, FileCheck, BarChart2, File, Bot, User, ChevronDown, Check } from 'lucide-react';
import { ClassifiedBy, useUpdateClassification } from '@/lib/graphql/documents';
import { useToast } from '@/components/Toast';

const classificationConfig: Record<string, {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}> = {
  invoice:  { label: 'Invoice',  icon: Receipt,    color: 'bg-purple-500/10 text-purple-400' },
  identity: { label: 'Identity', icon: CreditCard,  color: 'bg-accent-blue/10 text-accent-blue' },
  contract: { label: 'Contract', icon: FileCheck,   color: 'bg-status-success/10 text-status-success' },
  report:   { label: 'Report',   icon: BarChart2,   color: 'bg-accent-orange/10 text-accent-orange' },
  general:  { label: 'General',  icon: File,        color: 'bg-border-secondary text-text-muted' },
};

interface ClassificationBadgeProps {
  classification: string;
  classifiedBy?: ClassifiedBy;
  documentId?: string;
  editable?: boolean;
}

export default function ClassificationBadge({
  classification, classifiedBy, documentId, editable = false,
}: ClassificationBadgeProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const config = classificationConfig[classification.toLowerCase()] ?? classificationConfig.general;
  const Icon = config.icon;
  const { updateClassification } = useUpdateClassification();
  const { success } = useToast();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleSelect(newClassification: string) {
    if (documentId) {
      await updateClassification(documentId, newClassification);
      success('Classification updated');
    }
    setOpen(false);
  }

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (editable) setOpen(!open);
        }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${
          editable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
        }`}
      >
        <Icon size={10} />
        <span>{config.label}</span>
        {classifiedBy === 'AI' && <Bot size={9} className="opacity-60" />}
        {classifiedBy === 'USER' && <User size={9} className="opacity-60" />}
        {editable && <ChevronDown size={9} className="opacity-60" />}
      </button>

      {open && editable && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-50 py-1">
          {Object.entries(classificationConfig).map(([key, cfg]) => {
            const CfgIcon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-bg-hover transition-colors"
              >
                <CfgIcon size={12} className={cfg.color.split(' ')[1]} />
                <span>{cfg.label}</span>
                {key === classification.toLowerCase() && <Check size={10} className="ml-auto text-accent-blue" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
