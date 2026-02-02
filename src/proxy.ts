import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Redirect /skill and /heartbeat to canonical .md URLs so agents have a single
 * documented URL (e.g. dirabook.com/skill.md) and the path reads as a document.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const origin = request.nextUrl.origin;

  if (pathname === '/skill') {
    return NextResponse.redirect(`${origin}/skill.md`, 301);
  }
  if (pathname === '/heartbeat') {
    return NextResponse.redirect(`${origin}/heartbeat.md`, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/skill', '/heartbeat'],
};
