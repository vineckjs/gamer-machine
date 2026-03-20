import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsGateway } from './sessions.gateway';

const makePrismaMock = () =>
  ({
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  }) as unknown as PrismaService;

const makeGatewayMock = () =>
  ({
    emitBalanceUpdate: jest.fn(),
    emitWarning: jest.fn(),
    emitPaymentConfirmed: jest.fn(),
  }) as unknown as SessionsGateway;

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let gateway: ReturnType<typeof makeGatewayMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    gateway = makeGatewayMock();
    service = new SessionsService(prisma, gateway);
    jest.useFakeTimers();
    process.env.PRICE_PER_MINUTE_CENTS = '200';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('startSession', () => {
    it('throws NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.startSession('user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when balance is 0', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1', phone: '11999999999', balance_cents: 0,
        created_at: new Date(), updated_at: new Date(),
      });
      await expect(service.startSession('user-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when balance is negative', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1', phone: '11999999999', balance_cents: -100,
        created_at: new Date(), updated_at: new Date(),
      });
      await expect(service.startSession('user-1')).rejects.toThrow(BadRequestException);
    });

    it('creates session and returns it when balance is positive', async () => {
      const mockUser = {
        id: 'user-1', phone: '11999999999', balance_cents: 1000,
        created_at: new Date(), updated_at: new Date(),
      };
      const mockSession = {
        id: 'session-1', user_id: 'user-1', started_at: new Date(),
        ended_at: null, duration_seconds: null, cost_cents: null,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await service.startSession('user-1');
      expect(result.session).toEqual(mockSession);
      expect(prisma.session.create).toHaveBeenCalledWith({ data: { user_id: 'user-1' } });
    });
  });

  describe('cost calculation (Math.ceil to nearest minute)', () => {
    const makeSession = (durationSeconds: number) => ({
      id: 'session-1',
      user_id: 'user-1',
      started_at: new Date(Date.now() - durationSeconds * 1000),
      ended_at: null,
      duration_seconds: null,
      cost_cents: null,
    });

    const setupEndSession = (durationSeconds: number) => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(makeSession(durationSeconds));
      (prisma.$transaction as jest.Mock).mockResolvedValue([null, null]);
      (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    };

    it('1s → cost of 1 minute (200 cents)', async () => {
      setupEndSession(1);
      const result = await service.endSession('session-1');
      expect(result.cost_cents).toBe(200);
    });

    it('60s → cost of 1 minute (200 cents)', async () => {
      setupEndSession(60);
      const result = await service.endSession('session-1');
      expect(result.cost_cents).toBe(200);
    });

    it('61s → cost of 2 minutes (400 cents)', async () => {
      setupEndSession(61);
      const result = await service.endSession('session-1');
      expect(result.cost_cents).toBe(400);
    });

    it('120s → cost of 2 minutes (400 cents)', async () => {
      setupEndSession(120);
      const result = await service.endSession('session-1');
      expect(result.cost_cents).toBe(400);
    });

    it('121s → cost of 3 minutes (600 cents)', async () => {
      setupEndSession(121);
      const result = await service.endSession('session-1');
      expect(result.cost_cents).toBe(600);
    });
  });

  describe('endSession', () => {
    it('throws NotFoundException when session does not exist', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.endSession('missing')).rejects.toThrow(NotFoundException);
    });

    it('calls $transaction with the correct data', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-1', user_id: 'user-1',
        started_at: new Date(Date.now() - 60000),
        ended_at: null, duration_seconds: null, cost_cents: null,
      });
      (prisma.$transaction as jest.Mock).mockResolvedValue([null, null]);
      (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.endSession('session-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('clamps balance to 0 via updateMany', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-1', user_id: 'user-1',
        started_at: new Date(Date.now() - 60000),
        ended_at: null, duration_seconds: null, cost_cents: null,
      });
      (prisma.$transaction as jest.Mock).mockResolvedValue([null, null]);
      (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.endSession('session-1');

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-1', balance_cents: { lt: 0 } },
        data: { balance_cents: 0 },
      });
    });

    it('emits SESSION_ENDED warning via gateway', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-1', user_id: 'user-1',
        started_at: new Date(Date.now() - 60000),
        ended_at: null, duration_seconds: null, cost_cents: null,
      });
      (prisma.$transaction as jest.Mock).mockResolvedValue([null, null]);
      (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.endSession('session-1');

      expect(gateway.emitWarning).toHaveBeenCalledWith('user-1', { type: 'SESSION_ENDED' });
    });
  });

  describe('timer behavior', () => {
    it('emits balance_update after 5 seconds', async () => {
      const mockUser = {
        id: 'user-1', phone: '11999999999', balance_cents: 600,
        created_at: new Date(), updated_at: new Date(),
      };
      const mockSession = {
        id: 'session-1', user_id: 'user-1', started_at: new Date(),
        ended_at: null, duration_seconds: null, cost_cents: null,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      await service.startSession('user-1');

      await jest.advanceTimersByTimeAsync(5000);

      expect(gateway.emitBalanceUpdate).toHaveBeenCalledWith('user-1', expect.objectContaining({
        balance_cents: 600,
        session_id: 'session-1',
      }));
    });

    it('emits WARNING_1MIN exactly once when timeRemaining drops to ≤60s', async () => {
      // 200 cents, price 200/min → 60s max. Started 1s ago → timeRemaining = 59s ≤ 60s on first tick.
      const startedAt = new Date(Date.now() - 1000);
      const mockUser = {
        id: 'user-1', phone: '11999999999', balance_cents: 200,
        created_at: new Date(), updated_at: new Date(),
      };
      const mockSession = {
        id: 'session-1', user_id: 'user-1', started_at: startedAt,
        ended_at: null, duration_seconds: null, cost_cents: null,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.$transaction as jest.Mock).mockResolvedValue([null, null]);
      (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      await service.startSession('user-1');

      // First tick: 1s already elapsed + 5s = 6s; timeRemaining = 54s ≤ 60s → WARNING_1MIN
      await jest.advanceTimersByTimeAsync(5000);

      const count1 = (gateway.emitWarning as jest.Mock).mock.calls.filter(
        (c) => c[1]?.type === 'WARNING_1MIN',
      ).length;
      expect(count1).toBe(1);

      // Second tick: should NOT emit again
      await jest.advanceTimersByTimeAsync(5000);
      const count2 = (gateway.emitWarning as jest.Mock).mock.calls.filter(
        (c) => c[1]?.type === 'WARNING_1MIN',
      ).length;
      expect(count2).toBe(1);
    });

    it('emits WARNING_30SEC exactly once when timeRemaining drops to ≤30s', async () => {
      // 100 cents, price 200/min → 30s max. Started 1s ago → timeRemaining = 24s ≤ 30s on first tick.
      const startedAt = new Date(Date.now() - 1000);
      const mockUser = {
        id: 'user-1', phone: '11999999999', balance_cents: 100,
        created_at: new Date(), updated_at: new Date(),
      };
      const mockSession = {
        id: 'session-1', user_id: 'user-1', started_at: startedAt,
        ended_at: null, duration_seconds: null, cost_cents: null,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.$transaction as jest.Mock).mockResolvedValue([null, null]);
      (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      await service.startSession('user-1');

      await jest.advanceTimersByTimeAsync(5000);

      const count30 = (gateway.emitWarning as jest.Mock).mock.calls.filter(
        (c) => c[1]?.type === 'WARNING_30SEC',
      ).length;
      expect(count30).toBe(1);

      await jest.advanceTimersByTimeAsync(5000);
      const count30Again = (gateway.emitWarning as jest.Mock).mock.calls.filter(
        (c) => c[1]?.type === 'WARNING_30SEC',
      ).length;
      expect(count30Again).toBe(1);
    });

    it('calls endSession (emits SESSION_ENDED) when timeRemaining reaches 0', async () => {
      // 1 cent, price 200/min → 0.3s max. Started 61s ago → already expired on first tick.
      const startedAt = new Date(Date.now() - 61000);
      const mockUser = {
        id: 'user-1', phone: '11999999999', balance_cents: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const mockSession = {
        id: 'session-1', user_id: 'user-1', started_at: startedAt,
        ended_at: null, duration_seconds: null, cost_cents: null,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.$transaction as jest.Mock).mockResolvedValue([null, null]);
      (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      await service.startSession('user-1');

      await jest.advanceTimersByTimeAsync(5000);

      expect(gateway.emitWarning).toHaveBeenCalledWith('user-1', { type: 'SESSION_ENDED' });
    });
  });
});
