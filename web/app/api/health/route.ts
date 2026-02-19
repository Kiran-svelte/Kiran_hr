import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProviderStatus } from '@/lib/ai-gateway';

export async function GET() {
  try {
    // Check database connectivity
    let dbHealthy = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check AI provider status
    const aiProviders = getProviderStatus();

    const healthy = dbHealthy && aiProviders.some(p => p.isAvailable);

    return NextResponse.json({
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        ai_providers: aiProviders.map(p => ({
          name: p.name,
          status: p.isAvailable ? 'up' : 'down',
          failures: p.failureCount
        }))
      }
    }, {
      status: healthy ? 200 : 503
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, {
      status: 500
    });
  }
}
