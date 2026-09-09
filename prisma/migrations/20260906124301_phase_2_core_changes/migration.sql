/*
  Warnings:

  - You are about to drop the column `guest_secret_hash` on the `Mailbox` table. All the data in the column will be lost.
  - The `status` column on the `Mailbox` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[prefix]` on the table `Mailbox` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `url` to the `EmailAttachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prefix` to the `Mailbox` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('MAILBOX_CREATED', 'MAILBOX_CLAIMED', 'MAILBOX_ACCESSED', 'MAILBOX_DELETED', 'MAILBOX_RELEASED');

-- CreateEnum
CREATE TYPE "MailboxStatus" AS ENUM ('PUBLIC', 'PRIVATE');

-- DropIndex
DROP INDEX "Mailbox_address_key";

-- DropIndex
DROP INDEX "Mailbox_guest_secret_hash_idx";

-- AlterTable
ALTER TABLE "EmailAttachment" ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Mailbox" DROP COLUMN "guest_secret_hash",
ADD COLUMN     "prefix" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "MailboxStatus" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "is_expired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "deviceInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_mailboxId_idx" ON "AuditLog"("mailboxId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_prefix_key" ON "Mailbox"("prefix");

-- CreateIndex
CREATE INDEX "Mailbox_prefix_idx" ON "Mailbox"("prefix");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
