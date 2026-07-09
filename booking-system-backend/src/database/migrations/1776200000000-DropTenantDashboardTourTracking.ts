import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTenantDashboardTourTracking1776200000000 implements MigrationInterface {
  name = 'DropTenantDashboardTourTracking1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "tenant_dashboard_tour_completed_at"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "tenant_dashboard_tour_completed_at" TIMESTAMP WITH TIME ZONE
    `);
  }
}
