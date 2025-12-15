import { NextResponse } from 'next/server';
import { microserviceClient } from '@/lib/microservices/client';

export async function GET() {
  try {
    const healthData = await microserviceClient.getAllServicesHealth();
    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Error fetching microservice health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch microservice health' },
      { status: 500 }
    );
  }
}