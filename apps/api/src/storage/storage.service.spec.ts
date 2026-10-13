import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;
  const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<
    typeof getSignedUrl
  >;

  const mockConfig: Record<string, unknown> = {
    STORAGE_S3_BUCKET: 'test-bucket',
    STORAGE_PUBLIC_URL_PREFIX: 'https://cdn.example.com',
    STORAGE_S3_ENDPOINT: 'http://localhost:9000',
    STORAGE_S3_REGION: 'us-east-1',
    STORAGE_S3_ACCESS_KEY_ID: 'test-access',
    STORAGE_S3_SECRET_ACCESS_KEY: 'test-secret',
    STORAGE_S3_FORCE_PATH_STYLE: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              return mockConfig[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('upload', () => {
    it('uploads buffer to s3 and returns key and public url', async () => {
      mockSend.mockResolvedValue({});
      const buffer = Buffer.from('test-content');

      const result = await service.upload('/uploads/file.png', buffer, {
        contentType: 'image/png',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'uploads/file.png',
        Body: buffer,
        ContentType: 'image/png',
      });
      expect(result).toEqual({
        key: 'uploads/file.png',
        url: 'https://cdn.example.com/uploads/file.png',
      });
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('generates presigned upload url', async () => {
      mockGetSignedUrl.mockResolvedValue(
        'https://s3.example.com/presigned-upload',
      );

      const result = await service.getPresignedUploadUrl('/avatars/user.jpg', {
        contentType: 'image/jpeg',
        expiresIn: 300,
      });

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(PutObjectCommand),
        { expiresIn: 300 },
      );
      expect(result).toEqual({
        uploadUrl: 'https://s3.example.com/presigned-upload',
        key: 'avatars/user.jpg',
        expiresIn: 300,
      });
    });
  });

  describe('getPresignedDownloadUrl', () => {
    it('generates presigned download url', async () => {
      mockGetSignedUrl.mockResolvedValue(
        'https://s3.example.com/presigned-download',
      );

      const url = await service.getPresignedDownloadUrl('docs/file.pdf', 600);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        { expiresIn: 600 },
      );
      expect(url).toBe('https://s3.example.com/presigned-download');
    });
  });

  describe('resolvePublicUrl', () => {
    it('constructs public url using prefix and key', () => {
      const url = service.resolvePublicUrl('/images/logo.png');
      expect(url).toBe('https://cdn.example.com/images/logo.png');
    });
  });

  describe('delete', () => {
    it('sends DeleteObjectCommand with bucket and sanitized key', async () => {
      mockSend.mockResolvedValue({});

      await service.delete('/temp/file.txt');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'temp/file.txt',
      });
    });
  });

  describe('deleteMany', () => {
    it('sends DeleteObjectsCommand for multiple keys', async () => {
      mockSend.mockResolvedValue({});

      await service.deleteMany(['/temp/1.txt', 'temp/2.txt']);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectsCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Delete: {
          Objects: [{ Key: 'temp/1.txt' }, { Key: 'temp/2.txt' }],
          Quiet: true,
        },
      });
    });

    it('does nothing if keys array is empty', async () => {
      await service.deleteMany([]);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('returns true if object exists', async () => {
      mockSend.mockResolvedValue({});

      const exists = await service.exists('test.pdf');
      expect(exists).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(HeadObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'test.pdf',
      });
    });

    it('returns false when NotFound error is thrown', async () => {
      const notFoundError = new Error('NotFound');
      notFoundError.name = 'NotFound';
      mockSend.mockRejectedValue(notFoundError);

      const exists = await service.exists('missing.pdf');
      expect(exists).toBe(false);
    });

    it('returns false when 404 httpStatusCode is returned', async () => {
      const err = { $metadata: { httpStatusCode: 404 } };
      mockSend.mockRejectedValue(err);

      const exists = await service.exists('missing-404.pdf');
      expect(exists).toBe(false);
    });

    it('rethrows unexpected error', async () => {
      const unexpectedError = new Error('Network error');
      mockSend.mockRejectedValue(unexpectedError);

      await expect(service.exists('file.pdf')).rejects.toThrow('Network error');
    });
  });
});
