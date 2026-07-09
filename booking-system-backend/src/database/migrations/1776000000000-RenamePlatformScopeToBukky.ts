import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePlatformScopeToBukky1776000000000 implements MigrationInterface {
  name = 'RenamePlatformScopeToBukky1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform_settings" AS target
      SET
        "app_name" = CASE
          WHEN LOWER(target."app_name") = CONCAT('we', 'gox') THEN 'Bukky'
          ELSE target."app_name"
        END,
        "window_title" = CASE
          WHEN target."window_title" = CONCAT('We', 'gox Booking System') THEN 'Bukky Booking System'
          ELSE target."window_title"
        END,
        "logo_url" = CASE
          WHEN target."logo_url" = CONCAT('/we', 'gox-logo.svg') THEN '/bukky-logo.svg'
          ELSE target."logo_url"
        END,
        "favicon_url" = CASE
          WHEN target."favicon_url" = CONCAT('/we', 'gox-logo.svg') THEN '/bukky-logo.svg'
          ELSE target."favicon_url"
        END
      WHERE target."scope" = 'BUKKY'
    `);

    await queryRunner.query(`
      UPDATE "platform_settings" AS legacy
      SET
        "scope" = 'BUKKY',
        "app_name" = CASE
          WHEN LOWER(legacy."app_name") = CONCAT('we', 'gox') THEN 'Bukky'
          ELSE legacy."app_name"
        END,
        "window_title" = CASE
          WHEN legacy."window_title" = CONCAT('We', 'gox Booking System') THEN 'Bukky Booking System'
          ELSE legacy."window_title"
        END,
        "logo_url" = CASE
          WHEN legacy."logo_url" = CONCAT('/we', 'gox-logo.svg') THEN '/bukky-logo.svg'
          ELSE legacy."logo_url"
        END,
        "favicon_url" = CASE
          WHEN legacy."favicon_url" = CONCAT('/we', 'gox-logo.svg') THEN '/bukky-logo.svg'
          ELSE legacy."favicon_url"
        END
      WHERE legacy."scope" = CONCAT('WE', 'GOX')
        AND NOT EXISTS (
          SELECT 1
          FROM "platform_settings" AS current
          WHERE current."scope" = 'BUKKY'
        )
    `);

    await queryRunner.query(`
      DELETE FROM "platform_settings"
      WHERE "scope" = CONCAT('WE', 'GOX')
        AND EXISTS (
          SELECT 1
          FROM "platform_settings" AS current
          WHERE current."scope" = 'BUKKY'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform_settings"
      SET "scope" = CONCAT('WE', 'GOX')
      WHERE "scope" = 'BUKKY'
        AND NOT EXISTS (
          SELECT 1
          FROM "platform_settings" AS legacy
          WHERE legacy."scope" = CONCAT('WE', 'GOX')
        )
    `);

    await queryRunner.query(`
      DELETE FROM "platform_settings"
      WHERE "scope" = 'BUKKY'
        AND EXISTS (
          SELECT 1
          FROM "platform_settings" AS legacy
          WHERE legacy."scope" = CONCAT('WE', 'GOX')
        )
    `);
  }
}
