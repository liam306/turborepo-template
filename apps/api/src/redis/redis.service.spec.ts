import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

const mockRedisInstance = {
  status: 'wait',
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
  ping: jest.fn(),
};

const mockRedisConstructor = jest.fn();

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation((...args) => {
      mockRedisConstructor(...args);
      return mockRedisInstance;
    }),
    Redis: jest.fn().mockImplementation((...args) => {
      mockRedisConstructor(...args);
      return mockRedisInstance;
    }),
  };
});

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedisInstance.status = 'wait';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDIS_HOST') return 'localhost';
              if (key === 'REDIS_PORT') return 6379;
              if (key === 'REDIS_PASSWORD') return 'secret';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(mockRedisConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'localhost',
        port: 6379,
        password: 'secret',
        lazyConnect: true,
      }),
    );
  });

  describe('client getters', () => {
    it('should return redis client instance', () => {
      expect(service.client).toBe(mockRedisInstance);
      expect(service.getClient()).toBe(mockRedisInstance);
    });
  });

  describe('lifecycle', () => {
    it('should connect on onModuleInit if status is wait', async () => {
      await service.onModuleInit();
      expect(mockRedisInstance.connect).toHaveBeenCalled();
    });

    it('should catch error on onModuleInit without throwing', async () => {
      mockRedisInstance.connect.mockRejectedValueOnce(new Error('Conn failed'));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });

    it('should quit client on application shutdown if not ended', async () => {
      mockRedisInstance.status = 'ready';
      await service.onApplicationShutdown();
      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it('should not quit client if status is end', async () => {
      mockRedisInstance.status = 'end';
      await service.onApplicationShutdown();
      expect(mockRedisInstance.quit).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return null when key does not exist', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null);
      const res = await service.get('missing-key');
      expect(res).toBeNull();
      expect(mockRedisInstance.get).toHaveBeenCalledWith('missing-key');
    });

    it('should parse JSON when value is a valid JSON string', async () => {
      const data = { foo: 'bar', num: 123 };
      mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify(data));
      const res = await service.get('json-key');
      expect(res).toEqual(data);
    });

    it('should return raw string when value is plain string and not JSON', async () => {
      mockRedisInstance.get.mockResolvedValueOnce('plain_string');
      const res = await service.get<string>('str-key');
      expect(res).toBe('plain_string');
    });
  });

  describe('set', () => {
    it('should set string value without ttl', async () => {
      mockRedisInstance.set.mockResolvedValueOnce('OK');
      const res = await service.set('my-key', 'raw-value');
      expect(res).toBe('OK');
      expect(mockRedisInstance.set).toHaveBeenCalledWith('my-key', 'raw-value');
    });

    it('should serialize object to JSON and set with ttl', async () => {
      mockRedisInstance.set.mockResolvedValueOnce('OK');
      const data = { id: 1 };
      const res = await service.set('obj-key', data, 60);
      expect(res).toBe('OK');
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'obj-key',
        JSON.stringify(data),
        'EX',
        60,
      );
    });
  });

  describe('del', () => {
    it('should return 0 when no keys are provided', async () => {
      const res = await service.del();
      expect(res).toBe(0);
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it('should delete keys when provided', async () => {
      mockRedisInstance.del.mockResolvedValueOnce(2);
      const res = await service.del('k1', 'k2');
      expect(res).toBe(2);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('k1', 'k2');
    });
  });

  describe('exists', () => {
    it('should return 0 when no keys are provided', async () => {
      const res = await service.exists();
      expect(res).toBe(0);
      expect(mockRedisInstance.exists).not.toHaveBeenCalled();
    });

    it('should check existence of keys', async () => {
      mockRedisInstance.exists.mockResolvedValueOnce(1);
      const res = await service.exists('k1');
      expect(res).toBe(1);
      expect(mockRedisInstance.exists).toHaveBeenCalledWith('k1');
    });
  });

  describe('other operations', () => {
    it('should delegate expire', async () => {
      mockRedisInstance.expire.mockResolvedValueOnce(1);
      const res = await service.expire('k1', 120);
      expect(res).toBe(1);
      expect(mockRedisInstance.expire).toHaveBeenCalledWith('k1', 120);
    });

    it('should delegate ttl', async () => {
      mockRedisInstance.ttl.mockResolvedValueOnce(90);
      const res = await service.ttl('k1');
      expect(res).toBe(90);
      expect(mockRedisInstance.ttl).toHaveBeenCalledWith('k1');
    });

    it('should delegate keys', async () => {
      mockRedisInstance.keys.mockResolvedValueOnce(['k1', 'k2']);
      const res = await service.keys('k*');
      expect(res).toEqual(['k1', 'k2']);
      expect(mockRedisInstance.keys).toHaveBeenCalledWith('k*');
    });

    it('should delegate flushdb', async () => {
      mockRedisInstance.flushdb.mockResolvedValueOnce('OK');
      const res = await service.flushdb();
      expect(res).toBe('OK');
      expect(mockRedisInstance.flushdb).toHaveBeenCalled();
    });

    it('should delegate ping', async () => {
      mockRedisInstance.ping.mockResolvedValueOnce('PONG');
      const res = await service.ping();
      expect(res).toBe('PONG');
      expect(mockRedisInstance.ping).toHaveBeenCalled();
    });
  });
});
