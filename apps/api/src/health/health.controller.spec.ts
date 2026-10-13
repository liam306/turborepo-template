import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDbService: Partial<DatabaseService>;
  let mockRedisService: Partial<RedisService>;

  beforeEach(() => {
    mockDbService = {
      db: {
        execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      } as any,
    };
    mockRedisService = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };
    controller = new HealthController(
      mockDbService as DatabaseService,
      mockRedisService as RedisService,
    );
  });

  describe('check (liveness)', () => {
    it('should return health status ok with current timestamp', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('app-api');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('ready (readiness)', () => {
    it('should return status ok when both database and redis are healthy', async () => {
      const result = await controller.ready();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('app-api');
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.redis.status).toBe('up');
      expect(typeof result.checks.database.latencyMs).toBe('number');
      expect(typeof result.checks.redis.latencyMs).toBe('number');
    });

    it('should throw ServiceUnavailableException when database is down', async () => {
      (mockDbService.db!.execute as jest.Mock).mockRejectedValueOnce(
        new Error('PostgreSQL connection timeout'),
      );

      await expect(controller.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException when redis is down', async () => {
      (mockRedisService.ping as jest.Mock).mockRejectedValueOnce(
        new Error('Redis connection refused'),
      );

      await expect(controller.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should reuse cached readiness within TTL', async () => {
      await controller.ready();
      expect(mockDbService.db!.execute).toHaveBeenCalledTimes(1);
      expect(mockRedisService.ping).toHaveBeenCalledTimes(1);

      // Second call immediately within TTL
      await controller.ready();
      expect(mockDbService.db!.execute).toHaveBeenCalledTimes(1);
      expect(mockRedisService.ping).toHaveBeenCalledTimes(1);
    });
  });
});
