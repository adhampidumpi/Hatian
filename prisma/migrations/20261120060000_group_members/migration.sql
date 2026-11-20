-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'GROUP_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'EXPENSE_RESTORED';
ALTER TYPE "ActivityType" ADD VALUE 'PAYMENT_RESTORED';
ALTER TYPE "ActivityType" ADD VALUE 'MEMBER_ADDED';
ALTER TYPE "ActivityType" ADD VALUE 'MEMBER_REMOVED';

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_paidById_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseShare" DROP CONSTRAINT "ExpenseShare_userId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_fromId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_toId_fkey";

-- DropIndex
DROP INDEX "ExpenseShare_userId_idx";

-- AlterTable
ALTER TABLE "ExpenseShare" DROP CONSTRAINT "ExpenseShare_pkey",
DROP COLUMN "userId",
ADD COLUMN     "memberId" TEXT NOT NULL,
ADD CONSTRAINT "ExpenseShare_pkey" PRIMARY KEY ("expenseId", "memberId");

-- AlterTable
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_pkey",
ADD COLUMN     "colorIndex" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "removedAt" TIMESTAMP(3),
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "joinedAt" DROP NOT NULL,
ALTER COLUMN "joinedAt" DROP DEFAULT,
ADD CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "ExpenseShare_memberId_idx" ON "ExpenseShare"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "GroupMember"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseShare" ADD CONSTRAINT "ExpenseShare_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GroupMember"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "GroupMember"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_toId_fkey" FOREIGN KEY ("toId") REFERENCES "GroupMember"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

