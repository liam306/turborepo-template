import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  type _Object,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../config/env.validation';
import {
  IStorageService,
  PresignedUploadResult,
  PresignedUploadUrlOptions,
  UploadOptions,
  UploadResult,
} from './storage.interface';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlPrefix?: string;

  constructor(private readonly configService: ConfigService<EnvVars, true>) {
    this.bucket =
      this.configService.get('STORAGE_S3_BUCKET', { infer: true }) ||
      'app-storage';
    this.publicUrlPrefix = this.configService.get('STORAGE_PUBLIC_URL_PREFIX', {
      infer: true,
    });

    const endpoint = this.configService.get('STORAGE_S3_ENDPOINT', {
      infer: true,
    });
    const region =
      this.configService.get('STORAGE_S3_REGION', { infer: true }) ||
      'us-east-1';
    const accessKeyId = this.configService.get('STORAGE_S3_ACCESS_KEY_ID', {
      infer: true,
    });
    const secretAccessKey = this.configService.get(
      'STORAGE_S3_SECRET_ACCESS_KEY',
      { infer: true },
    );
    const forcePathStyle = Boolean(
      this.configService.get('STORAGE_S3_FORCE_PATH_STYLE', { infer: true }),
    );

    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region,
      forcePathStyle,
    };

    if (endpoint) {
      clientConfig.endpoint = endpoint;
    }

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.s3Client = new S3Client(clientConfig);
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const cleanKey = this.sanitizeKey(key);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
        Body: body,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
      }),
    );

    return {
      key: cleanKey,
      url: this.resolvePublicUrl(cleanKey) || undefined,
    };
  }

  async getPresignedUploadUrl(
    key: string,
    options: PresignedUploadUrlOptions,
  ): Promise<PresignedUploadResult> {
    const cleanKey = this.sanitizeKey(key);
    const expiresIn = options.expiresIn ?? 900; // 15 mins default

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: cleanKey,
      ContentType: options.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      uploadUrl,
      key: cleanKey,
      expiresIn,
    };
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
    const cleanKey = this.sanitizeKey(key);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: cleanKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async download(key: string): Promise<Buffer> {
    const cleanKey = this.sanitizeKey(key);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: cleanKey,
    });

    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error(`Empty response body when downloading key: ${cleanKey}`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  resolvePublicUrl(key: string): string | null {
    if (!this.publicUrlPrefix) {
      return null;
    }
    const cleanPrefix = this.publicUrlPrefix.replace(/\/+$/, '');
    const cleanKey = this.sanitizeKey(key);
    return `${cleanPrefix}/${cleanKey}`;
  }

  async delete(key: string): Promise<void> {
    const cleanKey = this.sanitizeKey(key);
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      }),
    );
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const cleanKeys = keys.map((k) => this.sanitizeKey(k));
    await this.s3Client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: cleanKeys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const cleanPrefix = this.sanitizeKey(prefix);
    let continuationToken: string | undefined = undefined;
    let totalDeleted = 0;

    do {
      const listRes: ListObjectsV2CommandOutput = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: cleanPrefix,
          ContinuationToken: continuationToken,
        }),
      );

      if (listRes.Contents && listRes.Contents.length > 0) {
        const objectsToDelete = listRes.Contents.filter((item: _Object) =>
          Boolean(item.Key),
        ).map((item: _Object) => ({
          Key: item.Key!,
        }));

        if (objectsToDelete.length > 0) {
          await this.s3Client.send(
            new DeleteObjectsCommand({
              Bucket: this.bucket,
              Delete: {
                Objects: objectsToDelete,
                Quiet: true,
              },
            }),
          );
          totalDeleted += objectsToDelete.length;
        }
      }

      continuationToken = listRes.IsTruncated
        ? listRes.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return totalDeleted;
  }

  async listByPrefix(prefix: string): Promise<string[]> {
    const cleanPrefix = this.sanitizeKey(prefix);
    let continuationToken: string | undefined = undefined;
    const allKeys: string[] = [];

    do {
      const listRes: ListObjectsV2CommandOutput = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: cleanPrefix,
          ContinuationToken: continuationToken,
        }),
      );

      if (listRes.Contents && listRes.Contents.length > 0) {
        for (const item of listRes.Contents) {
          if (item.Key) {
            allKeys.push(item.Key);
          }
        }
      }

      continuationToken = listRes.IsTruncated
        ? listRes.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return allKeys;
  }

  async exists(key: string): Promise<boolean> {
    const cleanKey = this.sanitizeKey(key);
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        }),
      );
      return true;
    } catch (error: unknown) {
      const err = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      this.logger.error(`Error checking object existence: ${cleanKey}`, error);
      throw error;
    }
  }

  private sanitizeKey(key: string): string {
    return key.replace(/^\/+/, '');
  }
}
