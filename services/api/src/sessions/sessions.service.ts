import { forwardRef, Inject, Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsGateway } from './sessions.gateway';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private timers = new Map<string, NodeJS.Timeout>();
  private warnedOnce = new Map<string, Set<string>>();

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SessionsGateway))
    private gateway: SessionsGateway,
  ) {}

  async startSession(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.balance_seconds <= 0) throw new BadRequestException('Insufficient balance');

    const session = await this.prisma.session.create({
      data: { user_id: userId },
    });

    this.scheduleTimer(session.id, userId, session.started_at);
    return { session, balance_seconds: user.balance_seconds, time_remaining_seconds: user.balance_seconds };
  }

  private scheduleTimer(sessionId: string, userId: string, startedAt: Date) {
    this.warnedOnce.set(sessionId, new Set());

    const interval = setInterval(async () => {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) { this.clearTimer(sessionId); return; }

        const elapsedSeconds = (Date.now() - startedAt.getTime()) / 1000;
        const timeRemaining = Math.max(0, user.balance_seconds - elapsedSeconds);

        this.gateway.emitBalanceUpdate(userId, {
          balance_seconds: user.balance_seconds,
          time_remaining_seconds: Math.floor(timeRemaining),
          session_id: sessionId,
        });

        const warned = this.warnedOnce.get(sessionId)!;
        if (timeRemaining <= 60 && !warned.has('1MIN')) {
          warned.add('1MIN');
          this.gateway.emitWarning(userId, { type: 'WARNING_1MIN' });
        }
        if (timeRemaining <= 30 && !warned.has('30SEC')) {
          warned.add('30SEC');
          this.gateway.emitWarning(userId, { type: 'WARNING_30SEC' });
        }
        if (timeRemaining <= 0) {
          await this.endSession(sessionId);
        }
      } catch (err) {
        this.logger.error(`Timer error for session ${sessionId}`, err);
        this.clearTimer(sessionId);
      }
    }, 5000);

    this.timers.set(sessionId, interval);
  }

  async findActiveSession(userId: string) {
    return this.prisma.session.findFirst({ where: { user_id: userId, ended_at: null } });
  }

  async endSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.ended_at) return { session_id: sessionId, cost_cents: session.cost_cents, duration_seconds: session.duration_seconds };

    this.clearTimer(sessionId);

    const now = new Date();
    const durationSeconds = Math.round((now.getTime() - session.started_at.getTime()) / 1000);

    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: { ended_at: now, duration_seconds: durationSeconds, cost_cents: 0 },
      }),
      this.prisma.user.update({
        where: { id: session.user_id },
        data: { balance_seconds: { decrement: durationSeconds } },
      }),
    ]);

    // Ensure balance doesn't go below 0
    await this.prisma.user.updateMany({
      where: { id: session.user_id, balance_seconds: { lt: 0 } },
      data: { balance_seconds: 0 },
    });

    const finalUser = await this.prisma.user.findUnique({
      where: { id: session.user_id },
      select: { balance_seconds: true },
    });
    this.gateway.emitBalanceUpdate(session.user_id, {
      balance_seconds: finalUser!.balance_seconds,
      time_remaining_seconds: 0,
      session_id: sessionId,
    });

    this.gateway.emitWarning(session.user_id, { type: 'SESSION_ENDED' });

    return { session_id: sessionId, cost_cents: 0, duration_seconds: durationSeconds };
  }

  private clearTimer(sessionId: string) {
    const t = this.timers.get(sessionId);
    if (t) { clearInterval(t); this.timers.delete(sessionId); }
    this.warnedOnce.delete(sessionId);
  }
}
