/*
  Warnings:

  - You are about to drop the column `balance_cents` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "balance_seconds" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "balance_cents",
ADD COLUMN     "balance_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "barbershop_bonus_granted" BOOLEAN NOT NULL DEFAULT false;
