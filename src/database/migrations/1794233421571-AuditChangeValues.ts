import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditChangeValues1794233421571 implements MigrationInterface {
  name = 'AuditChangeValues1794233421571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "old_value" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "new_value" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "new_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "old_value"`,
    );
  }
}
