import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandUserEmailLength1795000000000 implements MigrationInterface {
  name = 'ExpandUserEmailLength1795000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "email" TYPE character varying(254)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "email" TYPE character varying(150)',
    );
  }
}
