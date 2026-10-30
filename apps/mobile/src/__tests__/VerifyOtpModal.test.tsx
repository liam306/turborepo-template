// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Alert } from 'react-native';
import { VerifyOtpModal } from '../components/auth/VerifyOtpModal';

const { mockVerifyOtp, mockSendOtp } = vi.hoisted(() => ({
  mockVerifyOtp: vi.fn(),
  mockSendOtp: vi.fn(),
}));

vi.mock('@/hooks/queries', () => ({
  useVerifyEmailOtp: () => ({
    mutateAsync: mockVerifyOtp,
    isPending: false,
  }),
  useSendVerificationOtp: () => ({
    mutateAsync: mockSendOtp,
    isPending: false,
  }),
}));

describe('VerifyOtpModal Component', () => {
  let alertSpy: any;
  const defaultProps = {
    visible: true,
    email: 'user@example.com',
    isDark: false,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it('validates OTP minimum length before calling mutation', async () => {
    const { getByText } = render(<VerifyOtpModal {...defaultProps} />);
    const verifyBtn = getByText('auth.verifyBtn');
    fireEvent.click(verifyBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/auth\.otpPlaceholder|mã xác thực|otp/i),
    );
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('submits valid OTP and triggers success flow', async () => {
    mockVerifyOtp.mockResolvedValueOnce({ success: true });

    const { getByText } = render(<VerifyOtpModal {...defaultProps} />);

    // React Native Web Modal portals to document.body
    const input = document.querySelector('input')!;
    expect(input).toBeDefined();
    fireEvent.change(input, { target: { value: '123456' } });

    const verifyBtn = getByText('auth.verifyBtn');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        otp: '123456',
      });
      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/auth\.verifySuccess|thành công|success/i),
        expect.any(Array),
      );
    });

    // Invoke OK alert button callback
    const alertButtons = alertSpy.mock.calls[0][2];
    alertButtons[0].onPress();
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
  });

  it('handles OTP verification error', async () => {
    mockVerifyOtp.mockRejectedValueOnce(new Error('Invalid code'));

    const { getByText } = render(<VerifyOtpModal {...defaultProps} />);

    const input = document.querySelector('input')!;
    fireEvent.change(input, { target: { value: '000000' } });

    const verifyBtn = getByText('auth.verifyBtn');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        otp: '000000',
      });
      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/Invalid code|auth\.authFailed|thất bại|failed/i),
      );
    });
  });

  it('triggers OTP resend', async () => {
    mockSendOtp.mockResolvedValueOnce({ success: true });

    const { getByText } = render(<VerifyOtpModal {...defaultProps} />);
    const resendBtn = getByText('auth.resendOtp');
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(mockSendOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        type: 'email-verification',
      });
      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/auth\.resendSuccess|đã gửi|sent/i),
      );
    });
  });
});
