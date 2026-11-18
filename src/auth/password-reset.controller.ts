import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { PasswordResetService } from './password-reset.service';

@ApiTags('Authentication')
@Controller('auth')
@Public()
@UseGuards(ThrottlerGuard)
export class PasswordResetController {
  constructor(private readonly resets: PasswordResetService) {}

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Email a one-time password reset token; always returns a generic response',
  })
  request(@Body() dto: ForgotPasswordDto) {
    return this.resets.request(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reset a password and revoke existing access tokens',
  })
  reset(@Body() dto: ResetPasswordDto) {
    return this.resets.reset(dto.token, dto.password);
  }
}
