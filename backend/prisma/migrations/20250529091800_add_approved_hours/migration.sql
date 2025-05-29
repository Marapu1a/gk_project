-- AlterTable
ALTER TABLE "SupervisionRequest" ADD COLUMN     "approvedHoursCurator" DOUBLE PRECISION,
ADD COLUMN     "approvedHoursInstructor" DOUBLE PRECISION,
ADD COLUMN     "approvedHoursSupervisor" DOUBLE PRECISION;
