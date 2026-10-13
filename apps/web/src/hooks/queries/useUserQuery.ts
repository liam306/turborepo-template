import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api';
import type {
  IUserProfile,
  IUpdateProfileDto,
  ISetPasswordDto,
  IChangePasswordDto,
  IDeleteAccountDto,
} from '@repo/types';

export const userKeys = {
  all: ['user'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  sessions: () => [...userKeys.all, 'sessions'] as const,
};

export function useUserProfile(enabled = true) {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => userApi.getProfile(),
    enabled,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IUpdateProfileDto) => userApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(userKeys.profile(), updated);
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => userApi.uploadAvatar(formData),
    onSuccess: (res) => {
      queryClient.setQueryData<IUserProfile | undefined>(
        userKeys.profile(),
        (old) => (old ? { ...old, image: res.avatarUrl } : old),
      );
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useSetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ISetPasswordDto) => userApi.setPassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IChangePasswordDto) => userApi.changePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useDeleteData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => userApi.deleteData(),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IDeleteAccountDto) => userApi.deleteAccount(data),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useUserSessions(enabled = true) {
  return useQuery({
    queryKey: userKeys.sessions(),
    queryFn: () => userApi.getSessions(),
    enabled,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => userApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.sessions() });
    },
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => userApi.revokeOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.sessions() });
    },
  });
}
