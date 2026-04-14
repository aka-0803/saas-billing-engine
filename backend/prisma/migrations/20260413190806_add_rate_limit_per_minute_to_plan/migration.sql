-- AlterTable
ALTER TABLE `plan` ADD COLUMN `rate_limit_per_minute` INTEGER NOT NULL DEFAULT 60;
