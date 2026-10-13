import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/user.service';
import type {
  IUpdateProfileDto,
  ISetPasswordDto,
  IChangePasswordDto,
  IDeleteAccountDto,
} from '@repo/types';

export const userKeys = {
  all: ['user'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
};

export function useUserProfile(enabled = true) {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => userService.getProfile(),
    enabled,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IUpdateProfileDto) => userService.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(userKeys.profile(), updated);
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => userService.uploadAvatar(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useSetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ISetPasswordDto) => userService.setPassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IChangePasswordDto) => userService.changePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
}

export function useDeleteUserData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => userService.deleteUserData(),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IDeleteAccountDto) => userService.deleteAccount(data),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
