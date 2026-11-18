import {
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';

import {
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('AuditLogs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
@Roles(UserRole.ADMIN)
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // View all audit logs with filters.
  @Get()
  findAll(
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditLogsService.findAll(query);
  }

  // View one audit log.
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auditLogsService.findOne(id);
  }
}
