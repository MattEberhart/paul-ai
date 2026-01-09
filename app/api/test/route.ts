import { NextRequest, NextResponse } from 'next/server';

// Ensure this runs as a serverless function on Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Simple test endpoint to verify Vercel is receiving requests
 */
export async function GET(req: NextRequest) {
  console.log('Triggered');
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Triggered',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  console.log('Triggered');
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Triggered',
    timestamp: new Date().toISOString(),
    received: body
  });
}
