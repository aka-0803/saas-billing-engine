-- AlterTable
ALTER TABLE `Plan` ADD COLUMN `rate_limit_per_minute` INTEGER NOT NULL DEFAULT 60;
