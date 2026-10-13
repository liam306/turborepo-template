import type { SupportedLocale } from './common';

export type ThemeMode = 'system' | 'light' | 'dark';

export type UserRole = 'user' | 'admin';

export interface IUserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
  providers: string[];
  theme: ThemeMode;
  locale: SupportedLocale;
  bannedAt?: string | null;
  bannedReason?: string | null;
  bannedUntil?: string | null;
  deletedAt?: string | null;
}

export interface IUpdateProfileDto {
  name?: string;
  theme?: ThemeMode;
  locale?: SupportedLocale;
}

export interface ISetPasswordDto {
  newPassword: string;
}

export interface IChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface IDeleteAccountDto {
  password?: string;
}

export interface IAvatarUploadResponse {
  avatarUrl: string;
  message?: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image?: string | null;
  emailVerified?: boolean;
}

export interface IAuthSession {
  user: IAuthUser;
  token?: string;
}

export interface IAuthResponse {
  user?: IAuthUser;
  token?: string;
  message?: string;
}

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export interface IUserSession {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType: DeviceType;
  browser: string;
  os: string;
  isCurrent: boolean;
  createdAt: string;
  expiresAt: string;
  lastActiveAt?: string;
}
