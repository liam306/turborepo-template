'use client';

import React, { useState } from 'react';
import {
  User,
  KeyRound,
  Laptop,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useUserProfile,
  useUpdateProfile,
  useUploadAvatar,
  useSetPassword,
  useChangePassword,
  useDeleteData,
  useDeleteAccount,
  useSignOut,
} from '@/hooks/queries';
import { toast } from 'sonner';
import { AvatarCropModal } from '@/components/AvatarCropModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { ProfileTab } from './profile/ProfileTab';
import { SecurityTab } from './profile/SecurityTab';
import { SessionsTab } from './profile/SessionsTab';
import { DangerTab } from './profile/DangerTab';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const t = useTranslations('profile');
  const common = useTranslations('common');

  const { data: profile, isLoading, refetch: fetchProfile } = useUserProfile();
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();
  const setPasswordMutation = useSetPassword();
  const changePasswordMutation = useChangePassword();
  const deleteDataMutation = useDeleteData();
  const deleteAccountMutation = useDeleteAccount();
  const signOutMutation = useSignOut();

  const [customName, setCustomName] = useState<string | null>(null);
  const name = customName ?? profile?.name ?? '';

  // Avatar crop modal states
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] =
    useState(false);

  const resetAllMutations = () => {
    updateProfileMutation.reset();
    uploadAvatarMutation.reset();
    setPasswordMutation.reset();
    changePasswordMutation.reset();
    deleteDataMutation.reset();
    deleteAccountMutation.reset();
  };

  const activeError =
    updateProfileMutation.error ||
    uploadAvatarMutation.error ||
    setPasswordMutation.error ||
    changePasswordMutation.error ||
    deleteDataMutation.error ||
    deleteAccountMutation.error;

  const errorMsg = activeError
    ? activeError instanceof Error
      ? activeError.message
      : t('errorOccurred')
    : null;

  const successMsg = updateProfileMutation.isSuccess
    ? t('nameSuccess')
    : uploadAvatarMutation.isSuccess
      ? uploadAvatarMutation.data?.message || t('avatarSuccess')
      : setPasswordMutation.isSuccess
        ? setPasswordMutation.data?.message || t('passwordSetSuccess')
        : changePasswordMutation.isSuccess
          ? changePasswordMutation.data?.message || t('passwordChangeSuccess')
          : deleteDataMutation.isSuccess
            ? deleteDataMutation.data?.message || t('deleteDataSuccess')
            : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidImage'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadAvatar = (croppedBlob: Blob) => {
    resetAllMutations();
    const formData = new FormData();
    formData.append('file', croppedBlob, 'avatar.webp');

    uploadAvatarMutation.mutate(formData, {
      onSuccess: () => {
        fetchProfile();
      },
    });
  };

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    resetAllMutations();
    updateProfileMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setCustomName(null);
          fetchProfile();
        },
      },
    );
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (profile?.hasPassword && !currentPassword) {
      newErrors.currentPassword = t('pleaseEnterCurrentPassword');
    }
    if (!newPassword || newPassword.length < 8) {
      newErrors.newPassword = t('newPasswordMinLength');
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = t('confirmPasswordRequired');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('passwordMismatch');
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return;
    }

    setPasswordErrors({});
    resetAllMutations();
    const hasPassword = profile?.hasPassword;

    if (hasPassword) {
      changePasswordMutation.mutate(
        { currentPassword, newPassword },
        {
          onSuccess: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordErrors({});
          },
        },
      );
    } else {
      setPasswordMutation.mutate(
        { newPassword },
        {
          onSuccess: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordErrors({});
          },
        },
      );
    }
  };

  const handleDeleteData = () => {
    const confirmation = window.prompt(t('deleteDataConfirmPrompt'));
    if (!confirmation || confirmation.trim() !== t('deleteDataKeyword')) {
      return;
    }

    resetAllMutations();
    deleteDataMutation.mutate(undefined);
  };

  const proceedDeleteAccount = () => {
    let password = '';
    if (profile?.hasPassword) {
      const entered = window.prompt(t('deleteAccountPasswordPrompt'));
      if (!entered) return;
      password = entered;
    }

    resetAllMutations();
    deleteAccountMutation.mutate(
      { password },
      {
        onSuccess: async () => {
          onClose();
          await signOutMutation.mutateAsync();
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/login';
        },
      },
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl h-[620px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="border-b border-border px-6 py-4 text-left shrink-0">
            <DialogTitle className="text-lg font-bold">
              {t('title')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('subtitle')}
            </DialogDescription>
          </DialogHeader>

          {/* Feedback messages */}
          {(successMsg || errorMsg) && (
            <div className="px-6 pt-3 shrink-0">
              {successMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs font-semibold text-destructive dark:bg-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* Body */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs
              defaultValue="profile"
              orientation="vertical"
              className="flex-1 flex min-h-0 overflow-hidden"
            >
              {/* Left Column: Vertical Tabs Sidebar */}
              <div className="w-52 sm:w-60 shrink-0 border-r border-border bg-muted/20 p-3 overflow-y-auto">
                <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-1.5">
                  <TabsTrigger
                    value="profile"
                    className="w-full justify-start text-xs font-medium px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                  >
                    <User className="h-4 w-4 mr-2.5 shrink-0" />
                    <span>{t('tabProfile')}</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="security"
                    className="w-full justify-start text-xs font-medium px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                  >
                    <KeyRound className="h-4 w-4 mr-2.5 shrink-0" />
                    <span>{t('tabSecurity')}</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="sessions"
                    className="w-full justify-start text-xs font-medium px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                  >
                    <Laptop className="h-4 w-4 mr-2.5 shrink-0" />
                    <span>{t('tabSessions')}</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="danger"
                    className="w-full justify-start text-xs font-medium px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive data-[state=active]:font-semibold"
                  >
                    <Shield className="h-4 w-4 mr-2.5 shrink-0" />
                    <span>{t('tabDanger')}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Right Column: Tab Content */}
              <div className="flex-1 min-w-0 p-6 overflow-y-auto bg-background">
                <TabsContent
                  value="profile"
                  className="m-0 focus-visible:outline-none"
                >
                  <ProfileTab
                    profile={profile}
                    name={name}
                    onNameChange={setCustomName}
                    onUpdateName={handleUpdateName}
                    isUpdatingName={updateProfileMutation.isPending}
                    onFileSelect={handleFileChange}
                    isUploadingAvatar={uploadAvatarMutation.isPending}
                  />
                </TabsContent>

                <TabsContent
                  value="security"
                  className="m-0 focus-visible:outline-none"
                >
                  <SecurityTab
                    profile={profile}
                    currentPassword={currentPassword}
                    onCurrentPasswordChange={(val) => {
                      setCurrentPassword(val);
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          currentPassword: undefined,
                        }));
                      }
                    }}
                    newPassword={newPassword}
                    onNewPasswordChange={(val) => {
                      setNewPassword(val);
                      if (passwordErrors.newPassword) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          newPassword: undefined,
                        }));
                      }
                    }}
                    confirmPassword={confirmPassword}
                    onConfirmPasswordChange={(val) => {
                      setConfirmPassword(val);
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          confirmPassword: undefined,
                        }));
                      }
                    }}
                    onSubmit={handlePasswordSubmit}
                    isLoading={
                      setPasswordMutation.isPending ||
                      changePasswordMutation.isPending
                    }
                    errors={passwordErrors}
                  />
                </TabsContent>

                <TabsContent
                  value="sessions"
                  className="m-0 focus-visible:outline-none"
                >
                  <SessionsTab
                    onSuccessMsg={(msg) => toast.success(msg)}
                    onErrorMsg={(msg) => toast.error(msg)}
                  />
                </TabsContent>

                <TabsContent
                  value="danger"
                  className="m-0 focus-visible:outline-none"
                >
                  <DangerTab
                    onDeleteData={handleDeleteData}
                    isDeletingData={deleteDataMutation.isPending}
                    onRequestDeleteAccount={() =>
                      setShowDeleteAccountConfirm(true)
                    }
                    isDeletingAccount={deleteAccountMutation.isPending}
                  />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Avatar Crop Modal */}
      {selectedImageSrc && (
        <AvatarCropModal
          isOpen={isCropModalOpen}
          imageSrc={selectedImageSrc}
          onClose={() => {
            setIsCropModalOpen(false);
            setSelectedImageSrc(null);
          }}
          onCropComplete={handleUploadAvatar}
        />
      )}

      {/* Account Deletion Confirmation */}
      <ConfirmDialog
        open={showDeleteAccountConfirm}
        onOpenChange={setShowDeleteAccountConfirm}
        title={t('deleteAccountConfirmTitle')}
        description={t('deleteAccountConfirmDesc')}
        confirmLabel={common('delete')}
        cancelLabel={common('cancel')}
        variant="destructive"
        onConfirm={proceedDeleteAccount}
      />
    </>
  );
}
