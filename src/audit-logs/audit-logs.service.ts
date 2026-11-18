import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { AuditLog } from './audit-log.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  // ---------------------------------------------
  // GET ALL AUDIT LOGS
  // ---------------------------------------------

  async findAll(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    this.validateDateRange(query);

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .select([
        'audit.id',
        'audit.user_id',
        'audit.action',
        'audit.entity_type',
        'audit.entity_id',
        'audit.details',
        'audit.old_value',
        'audit.new_value',
        'audit.ip_address',
        'audit.created_at',
      ]);

    this.applyFilters(queryBuilder, query);

    const [logs, total] = await queryBuilder
      .orderBy('audit.created_at', 'DESC')
      .addOrderBy('audit.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------
  // GET SINGLE AUDIT LOG
  // ---------------------------------------------

  async findOne(id: string) {
    const log = await this.auditLogRepository.findOne({
      where: { id },
      select: {
        id: true,
        user_id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        details: true,
        old_value: true,
        new_value: true,
        ip_address: true,
        created_at: true,
      },
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return log;
  }

  // ---------------------------------------------
  // FILTER HELPER
  // ---------------------------------------------

  private applyFilters(
    qb: SelectQueryBuilder<AuditLog>,
    query: AuditLogQueryDto,
  ) {
    if (query.user_id) {
      qb.andWhere('audit.user_id = :userId', {
        userId: query.user_id,
      });
    }

    if (query.action) {
      qb.andWhere('LOWER(audit.action) = LOWER(:action)', {
        action: query.action,
      });
    }

    if (query.entity_type) {
      qb.andWhere(
        'LOWER(audit.entity_type) = LOWER(:entityType)',
        { entityType: query.entity_type },
      );
    }

    if (query.start_date) {
      qb.andWhere('audit.created_at >= :startDate', {
        startDate: new Date(query.start_date),
      });
    }

    if (query.end_date) {
      qb.andWhere('audit.created_at <= :endDate', {
        endDate: new Date(query.end_date),
      });
    }
  }

  // ---------------------------------------------
  // DATE VALIDATION
  // ---------------------------------------------

  private validateDateRange(query: AuditLogQueryDto) {
    if (query.start_date && query.end_date) {
      const start = new Date(query.start_date);
      const end = new Date(query.end_date);

      if (start > end) {
        throw new BadRequestException(
          'start_date cannot be later than end_date',
        );
      }
    }
  }
}
