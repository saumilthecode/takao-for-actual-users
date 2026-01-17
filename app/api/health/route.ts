/**
 * ============================================================
 * 📄 FILE: app/api/health/route.ts
 * 
 * 🎯 PURPOSE:
 *    Health check endpoint for API.
 * 
 * ============================================================
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now()
  });
}
