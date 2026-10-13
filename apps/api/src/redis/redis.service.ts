import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EnvVars } from '../config/env.validation';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisClient: Redis;

  constructor(private readonly configService: ConfigService<EnvVars, true>) {
    const host = this.configService.get('REDIS_HOST', { infer: true });
    const port = this.configService.get('REDIS_PORT', { infer: true });
    const password =
      this.configService.get('REDIS_PASSWORD', { infer: true }) || undefined;

    this.redisClient = new Redis({
      host,
      port,
      password,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisClient.on('connect', () => this.logger.log('Redis connected'));
    this.redisClient.on('ready', () => this.logger.log('Redis client ready'));
    this.redisClient.on('error', (err) =>
      this.logger.error(`Redis error: ${err.message}`),
    );
    this.redisClient.on('close', () =>
      this.logger.warn('Redis connection closed'),
    );
  }

  get client(): Redis {
    return this.redisClient;
  }

  getClient(): Redis {
    return this.redisClient;
  }

  async onModuleInit(): Promise<void> {
    try {
      if (this.redisClient.status === 'wait') {
        await this.redisClient.connect();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to connect Redis: ${message}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      if (this.redisClient.status !== 'end') {
        await this.redisClient.quit();
        this.logger.log('Redis connection closed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Error disconnecting Redis: ${message}`);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);

    if (ttlSeconds && ttlSeconds > 0) {
      return this.redisClient.set(key, serialized, 'EX', ttlSeconds);
    }

    return this.redisClient.set(key, serialized);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }
    return this.redisClient.del(...keys);
  }

  async exists(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }
    return this.redisClient.exists(...keys);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.redisClient.expire(key, ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    return this.redisClient.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.redisClient.keys(pattern);
  }

  async flushdb(): Promise<'OK'> {
    return this.redisClient.flushdb();
  }

  async ping(): Promise<string> {
    return this.redisClient.ping();
  }

  duplicate(): Redis {
    return this.redisClient.duplicate();
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.redisClient.publish(channel, message);
  }
}
