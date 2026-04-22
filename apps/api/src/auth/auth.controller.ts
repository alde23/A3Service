import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    if (!body?.email || typeof body.email !== 'string') {
      throw new BadRequestException('email is required');
    }
    if (!body?.password || typeof body.password !== 'string') {
      throw new BadRequestException('password is required');
    }

    return this.authService.login(body.email, body.password);
  }
}
