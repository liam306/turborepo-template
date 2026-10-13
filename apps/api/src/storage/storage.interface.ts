export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url?: string;
}

export interface PresignedUploadUrlOptions {
  contentType: string;
  expiresIn?: number;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export interface IStorageService {
  upload(
    key: string,
    body: Buffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  getPresignedUploadUrl(
    key: string,
    options: PresignedUploadUrlOptions,
  ): Promise<PresignedUploadResult>;

  getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;

  download(key: string): Promise<Buffer>;

  resolvePublicUrl(key: string): string | null;

  delete(key: string): Promise<void>;

  deleteMany(keys: string[]): Promise<void>;

  deleteByPrefix(prefix: string): Promise<number>;

  listByPrefix(prefix: string): Promise<string[]>;

  exists(key: string): Promise<boolean>;
}
