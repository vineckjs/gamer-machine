import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SessionsGateway } from '../sessions/sessions.gateway';

@Injectable()
export class AdminService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private usersService: UsersService,
    private gateway: SessionsGateway,
  ) {}

  login(username: string, password: string): { access_token: string } {
    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwtService.sign(
      { sub: 'admin', isAdmin: true },
      { secret: process.env.JWT_SECRET ?? 'dev_secret' },
    );
    return { access_token: token };
  }

  async findAllUsers() {
    return this.prisma.user.findMany({ orderBy: { created_at: 'desc' } });
  }

  async findUserByPhone(phone: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) throw new NotFoundException(`User with phone ${phone} not found`);
    return user;
  }

  async updateUser(phone: string, name: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) throw new NotFoundException(`User with phone ${phone} not found`);
    return this.prisma.user.update({ where: { id: user.id }, data: { name } });
  }

  async addCredit(phone: string, amount_cents: number) {
    const user = await this.usersService.findOrCreate(phone);

    await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          user_id: user.id,
          amount_cents,
          status: 'paid',
          source: 'admin',
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { balance_cents: { increment: amount_cents } },
      }),
    ]);

    const updatedUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    this.gateway.emitPaymentConfirmed(user.id, updatedUser.balance_cents);
    return updatedUser;
  }

  async getActiveOtp(phone: string) {
    await this.usersService.findOrCreate(phone);

    let otp = await this.prisma.otpCode.findFirst({
      where: { phone, used: false, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });

    if (!otp) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires_at = new Date(Date.now() + 5 * 60 * 1000);
      otp = await this.prisma.otpCode.create({ data: { phone, code, expires_at } });
    }

    return { code: otp.code, expires_at: otp.expires_at.toISOString() };
  }

  async getDepositHistory(phone: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) throw new NotFoundException(`User with phone ${phone} not found`);
    return this.prisma.payment.findMany({
      where: { user_id: user.id, status: 'paid' },
      orderBy: { created_at: 'desc' },
      select: { id: true, amount_cents: true, source: true, created_at: true },
    });
  }

  async getUsageHistory(phone: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) throw new NotFoundException(`User with phone ${phone} not found`);
    return this.prisma.session.findMany({
      where: { user_id: user.id, ended_at: { not: null } },
      orderBy: { started_at: 'desc' },
      select: { id: true, started_at: true, ended_at: true, duration_seconds: true, cost_cents: true },
    });
  }

  async getMonthlyReport(month: string) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 1));

    const pixPayments = await this.prisma.payment.findMany({
      where: { source: 'pix', status: 'paid', created_at: { gte: startDate, lt: endDate } },
      select: { amount_cents: true },
    });
    const pixRevenue = pixPayments.reduce((s, p) => s + p.amount_cents, 0);

    const adminCredits = await this.prisma.payment.findMany({
      where: { source: 'admin', status: 'paid', created_at: { gte: startDate, lt: endDate } },
      include: { user: { select: { phone: true, name: true } } },
      orderBy: { created_at: 'asc' },
    });
    const adminTotal = adminCredits.reduce((s, p) => s + p.amount_cents, 0);

    // Group by (user_id, ISO week) and calculate weekly excess
    const weeklyMap = new Map<string, { total: number; phone: string; name: string | null }>();
    for (const credit of adminCredits) {
      const key = `${credit.user_id}::${getISOWeekKey(credit.created_at)}`;
      const existing = weeklyMap.get(key);
      if (existing) {
        existing.total += credit.amount_cents;
      } else {
        weeklyMap.set(key, {
          total: credit.amount_cents,
          phone: credit.user.phone,
          name: credit.user.name,
        });
      }
    }

    const WEEKLY_BONUS_LIMIT = 1000; // R$10
    let adminExcess = 0;
    const excessDetails: {
      user_phone: string; user_name: string | null;
      semana: string; total_cents: number; bonus_cents: number; excesso_cents: number;
    }[] = [];

    for (const [key, data] of weeklyMap) {
      const semana = key.split('::')[1];
      const excesso = Math.max(0, data.total - WEEKLY_BONUS_LIMIT);
      if (excesso > 0) {
        adminExcess += excesso;
        excessDetails.push({
          user_phone: data.phone,
          user_name: data.name,
          semana,
          total_cents: data.total,
          bonus_cents: WEEKLY_BONUS_LIMIT,
          excesso_cents: excesso,
        });
      }
    }
    excessDetails.sort((a, b) => a.semana.localeCompare(b.semana));

    const manutencao = Math.round(pixRevenue * 0.20);
    const barbearia = Math.max(0, Math.round(pixRevenue * 0.20) - adminExcess);
    const vinicius = Math.round(pixRevenue * 0.30);
    const marcos = Math.round(pixRevenue * 0.30);

    return {
      month,
      pix_revenue_cents: pixRevenue,
      admin_total_cents: adminTotal,
      admin_bonus_cents: adminTotal - adminExcess,
      admin_excess_cents: adminExcess,
      distribuicao: { manutencao_cents: manutencao, barbearia_cents: barbearia, vinicius_cents: vinicius, marcos_cents: marcos },
      excess_details: excessDetails,
    };
  }
}

function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
