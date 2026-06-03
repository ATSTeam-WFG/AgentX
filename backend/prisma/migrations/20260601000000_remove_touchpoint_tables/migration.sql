-- DropForeignKey
ALTER TABLE "TouchpointScan" DROP CONSTRAINT "TouchpointScan_touchpointId_fkey";

-- DropForeignKey
ALTER TABLE "TouchpointScan" DROP CONSTRAINT "TouchpointScan_userId_fkey";

-- DropTable
DROP TABLE "TouchpointScan";

-- DropTable
DROP TABLE "Touchpoint";
