/**
 * Resolve path to agent docs (skill.md, heartbeat.md).
 * In Docker we set DOCS_DIR=/app/docs so the path is correct regardless of process.cwd().
 * Locally, DOCS_DIR is unset so we use process.cwd()/docs.
 */

import { join } from 'path';

export function getDocsDir(): string {
  const env = process.env.DOCS_DIR?.trim();
  if (env) return env;
  return join(process.cwd(), 'docs');
}

export function getDocPath(filename: string): string {
  return join(getDocsDir(), filename);
}
