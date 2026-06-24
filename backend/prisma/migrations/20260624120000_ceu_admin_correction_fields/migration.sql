-- CEU admin correction marker + previous value (для «было → стало»)
ALTER TABLE "CEUEntry" ADD COLUMN "isAdminCorrection" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CEUEntry" ADD COLUMN "previousValue" DOUBLE PRECISION;
