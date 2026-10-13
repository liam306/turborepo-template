import type { UserRole } from '@repo/types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role?: UserRole;
  image?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthenticatedRequest {
  user: AuthUser;
  session?: AuthSession;
  headers: Record<string, string | string[] | undefined>;
}
