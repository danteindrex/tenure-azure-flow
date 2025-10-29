import { NextRequest, NextResponse } from 'next/server'

// Temporarily disabled - auth import issue
export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    error: 'Temporarily disabled during migration',
    success: false
  }, { status: 503 })
}