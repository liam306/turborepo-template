import type {
  IUserProfile,
  IAuthUser,
  IAuthSession,
  IAuthResponse,
  IPaginatedResponse,
  IPaginatedMeta,
  IApiErrorResponse,
  UserRole,
  ThemeMode,
  SupportedLocale,
} from '../index';

type Expect<T extends true> = T;
type Extends<A, B> = A extends B ? true : false;

// 1. Roles & Themes
export type _TestRole = Expect<Extends<'admin' | 'user', UserRole>>;
export type _TestTheme = Expect<
  Extends<'light' | 'dark' | 'system', ThemeMode>
>;
export type _TestLocale = Expect<Extends<'en' | 'vi', SupportedLocale>>;

// 2. Profile Contract
export type _TestProfile = Expect<
  Extends<
    {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image: string | null;
      role: 'admin' | 'user';
      createdAt: string;
      updatedAt: string;
      hasPassword: boolean;
      providers: string[];
      theme: 'system' | 'light' | 'dark';
      locale: 'en' | 'vi';
    },
    IUserProfile
  >
>;

// 3. Auth Contracts
export type _TestAuthUser = Expect<
  Extends<
    {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    },
    IAuthUser
  >
>;

export type _TestAuthSession = Expect<
  Extends<
    {
      user: IAuthUser;
      token: string;
    },
    IAuthSession
  >
>;

export type _TestAuthResponse = Expect<
  Extends<
    {
      token?: string;
      message?: string;
    },
    IAuthResponse
  >
>;

// 4. Pagination Contract
export type _TestPagination = Expect<
  Extends<
    {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    IPaginatedMeta
  >
>;

export type _TestPaginatedResponse = Expect<
  Extends<
    {
      success: boolean;
      data: IUserProfile[];
      pagination: IPaginatedMeta;
    },
    IPaginatedResponse<IUserProfile>
  >
>;

// 5. Error Envelope Contract
export type _TestApiErrorResponse = Expect<
  Extends<
    {
      success: false;
      message: string;
      statusCode: number;
      timestamp: string;
    },
    IApiErrorResponse
  >
>;
