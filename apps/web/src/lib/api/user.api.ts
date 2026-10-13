import { apiClient } from '../api-client';
import type {
  IAvatarUploadResponse,
  IChangePasswordDto,
  IDeleteAccountDto,
  IMessageResponse,
  ISetPasswordDto,
  IUpdateProfileDto,
  IUserProfile,
  IUserSession,
} from '@repo/types';

export const userApi = {
  getProfile: () => apiClient<IUserProfile>('/users/me'),

  updateProfile: (data: IUpdateProfileDto) =>
    apiClient<IUserProfile>('/users/profile', {
      method: 'PATCH',
      data,
    }),

  uploadAvatar: (formData: FormData) =>
    apiClient<IAvatarUploadResponse>('/users/avatar', {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  setPassword: (data: ISetPasswordDto) =>
    apiClient<IMessageResponse>('/users/set-password', {
      method: 'POST',
      data,
    }),

  changePassword: (data: IChangePasswordDto) =>
    apiClient<IMessageResponse>('/users/change-password', {
      method: 'POST',
      data,
    }),

  deleteData: () =>
    apiClient<IMessageResponse>('/users/me/data', {
      method: 'DELETE',
    }),

  deleteAccount: (data: IDeleteAccountDto) =>
    apiClient<IMessageResponse>('/users/me', {
      method: 'DELETE',
      data,
    }),

  getSessions: () => apiClient<IUserSession[]>('/users/sessions'),

  revokeSession: (sessionId: string) =>
    apiClient<IMessageResponse>(`/users/sessions/${sessionId}`, {
      method: 'DELETE',
    }),

  revokeOtherSessions: () =>
    apiClient<IMessageResponse>('/users/sessions/others', {
      method: 'DELETE',
    }),
};
