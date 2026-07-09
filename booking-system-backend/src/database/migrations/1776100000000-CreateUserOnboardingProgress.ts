import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserOnboardingProgress1776100000000 implements MigrationInterface {
  name = 'CreateUserOnboardingProgress1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_onboarding_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "tenant_id" uuid,
        "role" character varying(32) NOT NULL,
        "module_key" character varying(96) NOT NULL,
        "version" character varying(32) NOT NULL,
        "completed_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "UQ_user_onboarding_progress_user_module_version" UNIQUE ("user_id", "module_key", "version"),
        CONSTRAINT "PK_user_onboarding_progress" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_onboarding_progress_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_onboarding_progress_user_completed"
      ON "user_onboarding_progress" ("user_id", "completed_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_onboarding_progress_user_completed"`);
    await queryRunner.query(`DROP TABLE "user_onboarding_progress"`);
  }
}
