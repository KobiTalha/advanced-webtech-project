import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordRecovery1794910000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD "token_version" integer NOT NULL DEFAULT 0',
    );
    await queryRunner.query(`CREATE TABLE "password_resets" (
      "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
      "token_hash" varchar(64) NOT NULL UNIQUE,
      "expires_at" timestamp NOT NULL
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "password_resets"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "token_version"');
  }
}
