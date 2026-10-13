import { apiClient } from './apiClient';
import type {
  IUserProfile,
  IUpdateProfileDto,
  ISetPasswordDto,
  IChangePasswordDto,
  IDeleteAccountDto,
} from '@repo/types';

export const userService = {
  getProfile: async () => {
    const res = await apiClient.get<IUserProfile>('/users/me');
    return res.data;
  },

  updateProfile: async (data: IUpdateProfileDto) => {
    const res = await apiClient.patch<IUserProfile>('/users/profile', data);
    return res.data;
  },

  uploadAvatar: async (formData: FormData) => {
    const res = await apiClient.postFormData<{ avatarUrl: string }>(
      '/users/avatar',
      formData,
    );
    return res.data;
  },

  setPassword: async (data: ISetPasswordDto) => {
    const res = await apiClient.post<{ message: string }>(
      '/users/set-password',
      data,
    );
    return res.data;
  },

  changePassword: async (data: IChangePasswordDto) => {
    const res = await apiClient.post<{ message: string }>(
      '/users/change-password',
      data,
    );
    return res.data;
  },

  deleteUserData: async () => {
    const res = await apiClient.delete<{ message: string }>('/users/me/data');
    return res.data;
  },

  deleteAccount: async (data: IDeleteAccountDto) => {
    const res = await apiClient.delete<{ message: string }>('/users/me', {
      data,
    });
    return res.data;
  },
};
