export interface SendOtpDto {
  phone: string;
}

export interface SendOtpResponseDto {
  message: string;
  expires_at: string;
}

export interface VerifyOtpDto {
  phone: string;
  code: string;
}

export interface VerifyOtpResponseDto {
  access_token: string;
  user: import('./user').UserDto;
}
