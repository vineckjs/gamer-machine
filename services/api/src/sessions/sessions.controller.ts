import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionsService } from './sessions.service';

class EndSessionDto {
  @IsString()
  session_id!: string;
}

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Post('start')
  startSession(@Request() req: any) {
    return this.sessionsService.startSession(req.user.userId);
  }

  @Post('end')
  endSession(@Body() dto: EndSessionDto) {
    return this.sessionsService.endSession(dto.session_id);
  }
}
