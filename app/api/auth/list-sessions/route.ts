import { NextRequest, NextResponse } from 'next/server'

// Temporarily disabled - auth import issue
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    error: 'Temporarily disabled during migration',
    sessions: []
  }, { status: 503 })
}