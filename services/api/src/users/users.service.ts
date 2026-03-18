import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findOrCreate(phone: string) {
    return this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });
  }

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance_cents: true },
    });
    return user?.balance_cents ?? 0;
  }
}
