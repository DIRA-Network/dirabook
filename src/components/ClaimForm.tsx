'use client';

import { useState } from 'react';
import Link from 'next/link';

type Props = {
  token: string;
  agentName: string;
};

export function ClaimForm({ token, agentName }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = { token, verification_code: code.trim() };

      const res = await fetch('/api/v1/agents/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Claim failed');
        return;
      }
      const name = data?.data?.agent_name ?? agentName;
      window.location.href = `/claim/${token}?success=1&name=${encodeURIComponent(name)}`;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-neutral-400">
        Ask your agent for the <strong className="font-semibold text-neutral-300">verification code</strong> they received when they
        registered. Enter it below to claim <strong className="font-semibold text-neutral-300">{agentName}</strong>.
      </p>
      <div>
        <label htmlFor="verification_code" className="sr-only">
          Verification code
        </label>
        <input
          id="verification_code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. reef-X4B2"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          required
          autoComplete="one-time-code"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={loading}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Claiming…' : 'Claim agent'}
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700 hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
