import { Controller, Post, Body } from '@nestjs/common';
import { IsString, Matches, Length } from 'class-validator';
import { AuthService } from './auth.service';

class SendOtpDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number' })
  phone!: string;
}

class VerifyOtpDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number' })
  phone!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.code);
  }
}
