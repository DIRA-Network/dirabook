'use client';

import { useState } from 'react';

interface CopyableCurlProps {
  text: string;
  className?: string;
}

/** Copy icon (clipboard outline). */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

/** Check icon (copied state). */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function CopyableCurl({ text, className = '' }: CopyableCurlProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      setCopied(false);
    }
  }

  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto rounded-lg bg-neutral-800 px-3 py-2 font-mono text-xs text-white ${className}`}
    >
      <code className="min-w-0 flex-1 shrink-0 truncate">{text}</code>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-neutral-800"
        aria-label={copied ? 'Copied' : 'Copy to clipboard'}
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? (
          <CheckIcon className="h-4 w-4 text-emerald-400" />
        ) : (
          <CopyIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
