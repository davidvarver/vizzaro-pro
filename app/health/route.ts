import { NextResponse } from 'next/server';

/**
 * Auto-created by CI-Healing demo.
 * Returns { status: 'ok' } with HTTP 200.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
