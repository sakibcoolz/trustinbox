import { ShieldCheck } from 'lucide-react';
import type { PIIType } from '@/lib/types';
import { cn } from '@/lib/utils';

const PII_LABELS: Record<PIIType, string> = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  SSN: 'SSN',
  CREDIT_CARD: 'Card',
  NI_NUMBER: 'NI #',
};

const REDACTION_TOKEN_REGEX = /\[(EMAIL|PHONE|SSN|CARD|NI_NUMBER|REDACTED[A-Z_]*)\]/g;

interface RedactionBadgeProps {
  types?: PIIType[];
  className?: string;
}

/**
 * Visual indicator that PII redaction was applied to the surrounding content.
 * Shows the categories of PII that were redacted (without revealing values).
 */
export function RedactionBadge({ types, className }: RedactionBadgeProps) {
  const labels = (types ?? []).map((t) => PII_LABELS[t]).join(', ');
  return (
    <span
      title={labels ? `PII redacted: ${labels}` : 'PII automatically redacted before storage'}
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-accent-cyan/10 text-accent-cyan',
        'text-[10px] px-1.5 py-0.5 font-medium whitespace-nowrap',
        className,
      )}
    >
      <ShieldCheck size={10} />
      PII Redacted
      {labels && <span className="text-text-secondary">· {labels}</span>}
    </span>
  );
}

/**
 * Renders a string with `[EMAIL]`, `[PHONE]`, `[CARD]`, etc. tokens
 * highlighted in the cyan PII accent color.
 */
export function HighlightRedacted({ text, className }: { text: string; className?: string }) {
  const parts: Array<{ text: string; redacted: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // Reset state on the shared regex.
  REDACTION_TOKEN_REGEX.lastIndex = 0;
  while ((match = REDACTION_TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), redacted: false });
    }
    parts.push({ text: match[0], redacted: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), redacted: false });
  }
  return (
    <span className={cn('font-mono text-xs text-text-secondary break-all', className)}>
      {parts.map((p, i) =>
        p.redacted ? (
          <span
            key={i}
            className="inline-block px-1 rounded bg-accent-cyan/15 text-accent-cyan font-semibold"
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}

/** Detects which PII types appear in a redacted string by scanning for tokens. */
export function detectRedactedTypes(text: string): PIIType[] {
  const found = new Set<PIIType>();
  if (/\[EMAIL\]/.test(text)) found.add('EMAIL');
  if (/\[PHONE\]/.test(text)) found.add('PHONE');
  if (/\[SSN\]/.test(text)) found.add('SSN');
  if (/\[CARD\]/.test(text)) found.add('CREDIT_CARD');
  if (/\[NI_NUMBER\]/.test(text)) found.add('NI_NUMBER');
  return Array.from(found);
}
