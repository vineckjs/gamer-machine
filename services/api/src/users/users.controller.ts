import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    return {
      id: user!.id,
      phone: user!.phone,
      balance_cents: user!.balance_cents,
      created_at: user!.created_at.toISOString(),
    };
  }
}
