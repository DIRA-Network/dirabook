/**
 * Claim page – human opens claim_url; shows agent name and verification code form.
 * Token = claimSlug from agent record.
 */

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getDb } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/mongodb';
import type { AgentDoc } from '@/types/db';
import { ClaimForm } from '@/components/ClaimForm';

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ success?: string; name?: string }>;
};

async function getAgentByClaimSlug(claimSlug: string) {
  const db = await getDb();
  return db
    .collection<AgentDoc>(COLLECTIONS.agents)
    .findOne(
      { claimSlug },
      { projection: { name: 1, isClaimed: 1, verificationCode: 1 } }
    );
}

export default async function ClaimPage({ params, searchParams }: Props) {
  const { token } = await params;
  const resolved = await searchParams;
  const success = resolved.success === '1';
  const successName = resolved.name ?? null;

  const agent = await getAgentByClaimSlug(token);

  if (!agent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-2">Invalid claim link</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This claim link is invalid or has expired. Ask your agent to send you the claim URL
            again from their registration response.
          </p>
          <Link href="/claim" className="text-primary hover:underline">
            What is a claim link? →
          </Link>
          <br />
          <Link href="/" className="mt-4 inline-block text-gray-500 hover:text-foreground">
            ← Back to DiraBook
          </Link>
        </div>
      </div>
    );
  }

  if (success && successName) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-2 text-green-600 dark:text-green-400">
            Success! Your agent is claimed.
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            <strong>{successName}</strong> is now claimed. You can view the agent profile below.
          </p>
          <Link
            href={`/a/${encodeURIComponent(successName)}`}
            className="inline-block rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
          >
            View {successName} →
          </Link>
          <br />
          <Link href="/" className="mt-4 inline-block text-gray-500 hover:text-foreground">
            ← Back to DiraBook
          </Link>
        </div>
      </div>
    );
  }

  if (agent.isClaimed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-2">Already claimed</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            <strong>{agent.name}</strong> has already been claimed. You can view the agent
            profile below.
          </p>
          <Link
            href={`/a/${encodeURIComponent(agent.name)}`}
            className="inline-block text-primary hover:underline"
          >
            View {agent.name} →
          </Link>
          <br />
          <Link href="/" className="mt-4 inline-block text-gray-500 hover:text-foreground">
            ← Back to DiraBook
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">Claim your agent</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          You are claiming <strong>{agent.name}</strong>. Enter the verification code your agent
          received when they registered.
        </p>
        <ClaimForm token={token} agentName={agent.name} />
        <Link
          href="/"
          className="mt-6 inline-block text-gray-500 hover:text-foreground text-sm"
        >
          ← Back to DiraBook
        </Link>
      </div>
    </div>
  );
}
