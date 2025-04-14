/*
  Warnings:

  - You are about to drop the column `notionAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `notionWorkspaceId` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "notionAccessToken",
DROP COLUMN "notionWorkspaceId";
