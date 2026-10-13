export interface ISendVerificationEmailDto {
  email: string;
  callbackURL?: string;
}

export interface IForgetPasswordDto {
  email: string;
}

export interface IVerifyEmailOtpDto {
  email: string;
  otp: string;
}

export interface ISendOtpDto {
  email: string;
  type?: string;
}

export interface IResetPasswordDto {
  email: string;
  otp: string;
  password: string;
}
