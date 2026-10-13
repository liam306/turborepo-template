import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
}

export interface ComponentHealth {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

export interface ReadinessCheckResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
  };
}

@ApiTags('Health')
@Controller('health')
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class HealthController {
  private readonly CACHE_TTL_MS = 3000;
  private cachedReadiness: {
    data: ReadinessCheckResponse;
    isHealthy: boolean;
    cachedAt: number;
  } | null = null;

  constructor(
    private readonly dbService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check API service liveness status' })
  @ApiResponse({
    status: 200,
    description: 'Service process is alive and operating normally',
  })
  check(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'app-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check API readiness status (PostgreSQL & Redis)' })
  @ApiResponse({
    status: 200,
    description: 'Service and dependencies are ready to accept traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Service dependencies are unavailable',
  })
  async ready(): Promise<ReadinessCheckResponse> {
    const now = Date.now();
    if (
      this.cachedReadiness &&
      now - this.cachedReadiness.cachedAt < this.CACHE_TTL_MS
    ) {
      if (!this.cachedReadiness.isHealthy) {
        throw new ServiceUnavailableException(this.cachedReadiness.data);
      }
      return this.cachedReadiness.data;
    }

    const [dbStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const isHealthy = dbStatus.status === 'up' && redisStatus.status === 'up';
    const response: ReadinessCheckResponse = {
      status: isHealthy ? 'ok' : 'error',
      service: 'app-api',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        redis: redisStatus,
      },
    };

    this.cachedReadiness = {
      data: response,
      isHealthy,
      cachedAt: now,
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.withTimeout(this.dbService.db.execute(sql`SELECT 1`), 2000);
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: message,
      };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      const reply = await this.withTimeout(this.redisService.ping(), 2000);
      if (reply === 'PONG') {
        return {
          status: 'up',
          latencyMs: Date.now() - start,
        };
      }
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: `Unexpected Redis response: ${reply}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: message,
      };
    }
  }
}
