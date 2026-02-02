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
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Ask your agent for the <strong>verification code</strong> they received when they
        registered. Enter it below to claim <strong>{agentName}</strong>.
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
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-foreground placeholder:text-gray-500"
          required
          autoComplete="one-time-code"
          disabled={loading}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Claiming…' : 'Claim agent'}
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
