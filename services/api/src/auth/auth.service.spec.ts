import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SmsService } from './sms.service';

const makePrismaMock = () =>
  ({
    otpCode: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  }) as unknown as PrismaService;

const makeJwtMock = () =>
  ({
    sign: jest.fn(),
  }) as unknown as JwtService;

const makeUsersServiceMock = () =>
  ({
    findOrCreate: jest.fn(),
    findByPhone: jest.fn(),
  }) as unknown as UsersService;

const makeSmsMock = () =>
  ({
    sendSms: jest.fn(),
  }) as unknown as SmsService;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let jwtService: ReturnType<typeof makeJwtMock>;
  let usersService: ReturnType<typeof makeUsersServiceMock>;
  let smsService: ReturnType<typeof makeSmsMock>;

  const mockUser = {
    id: 'user-1', phone: '11999999999', balance_cents: 0,
    created_at: new Date(), updated_at: new Date(),
  };

  beforeEach(() => {
    prisma = makePrismaMock();
    jwtService = makeJwtMock();
    usersService = makeUsersServiceMock();
    smsService = makeSmsMock();
    service = new AuthService(prisma, jwtService, usersService, smsService);
  });

  describe('sendOtp', () => {
    it('creates an OtpCode record in the DB and calls SmsService', async () => {
      (usersService.findOrCreate as jest.Mock).mockResolvedValue(mockUser);
      (prisma.otpCode.create as jest.Mock).mockResolvedValue({
        id: 'otp-1', phone: '11999999999', code: '123456',
        expires_at: new Date(Date.now() + 300000), used: false, created_at: new Date(),
      });
      (smsService.sendSms as jest.Mock).mockResolvedValue(undefined);

      const result = await service.sendOtp('11999999999');

      expect(prisma.otpCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ phone: '11999999999' }),
      });
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '11999999999',
        expect.stringContaining('Gamer Machine'),
      );
      expect(result).toHaveProperty('message', 'OTP sent');
      expect(result).toHaveProperty('expires_at');
    });
  });

  describe('verifyOtp', () => {
    it('returns access_token and user on valid OTP', async () => {
      const validOtp = {
        id: 'otp-1', phone: '11999999999', code: '123456',
        expires_at: new Date(Date.now() + 300000), used: false, created_at: new Date(),
      };
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue(validOtp);
      (prisma.otpCode.update as jest.Mock).mockResolvedValue({ ...validOtp, used: true });
      (usersService.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.sign as jest.Mock).mockReturnValue('jwt-token');

      const result = await service.verifyOtp('11999999999', '123456');

      expect(result.access_token).toBe('jwt-token');
      expect(result.user.id).toBe('user-1');
    });

    it('marks OTP as used after successful verification', async () => {
      const validOtp = {
        id: 'otp-1', phone: '11999999999', code: '123456',
        expires_at: new Date(Date.now() + 300000), used: false, created_at: new Date(),
      };
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue(validOtp);
      (prisma.otpCode.update as jest.Mock).mockResolvedValue({ ...validOtp, used: true });
      (usersService.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.sign as jest.Mock).mockReturnValue('jwt-token');

      await service.verifyOtp('11999999999', '123456');

      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { used: true },
      });
    });

    it('throws UnauthorizedException when OTP code is wrong', async () => {
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.verifyOtp('11999999999', '000000')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when OTP is expired (findFirst returns null via expires_at filter)', async () => {
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.verifyOtp('11999999999', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when OTP is already used (findFirst returns null via used:false filter)', async () => {
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.verifyOtp('11999999999', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException when user not found after valid OTP', async () => {
      const validOtp = {
        id: 'otp-1', phone: '11999999999', code: '123456',
        expires_at: new Date(Date.now() + 300000), used: false, created_at: new Date(),
      };
      (prisma.otpCode.findFirst as jest.Mock).mockResolvedValue(validOtp);
      (prisma.otpCode.update as jest.Mock).mockResolvedValue({ ...validOtp, used: true });
      (usersService.findByPhone as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyOtp('11999999999', '123456')).rejects.toThrow(BadRequestException);
    });
  });
});
