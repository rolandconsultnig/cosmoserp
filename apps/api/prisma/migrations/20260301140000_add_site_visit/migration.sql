-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" VARCHAR(2048) NOT NULL,
    "referrer" VARCHAR(2048),
    "pageTitle" VARCHAR(500),
    "sessionId" VARCHAR(64),
    "ip" VARCHAR(45) NOT NULL,
    "userAgent" TEXT,
    "browserName" VARCHAR(64),
    "browserVersion" VARCHAR(32),
    "osName" VARCHAR(64),
    "osVersion" VARCHAR(32),
    "deviceType" VARCHAR(32),
    "deviceVendor" VARCHAR(64),
    "deviceModel" VARCHAR(64),
    "countryCode" VARCHAR(2),
    "countryName" VARCHAR(100),
    "region" VARCHAR(128),
    "city" VARCHAR(128),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteVisit_createdAt_idx" ON "SiteVisit"("createdAt");

-- CreateIndex
CREATE INDEX "SiteVisit_path_idx" ON "SiteVisit"("path");

-- CreateIndex
CREATE INDEX "SiteVisit_countryCode_idx" ON "SiteVisit"("countryCode");

-- CreateIndex
CREATE INDEX "SiteVisit_deviceType_idx" ON "SiteVisit"("deviceType");

-- CreateIndex
CREATE INDEX "SiteVisit_browserName_idx" ON "SiteVisit"("browserName");

-- CreateIndex
CREATE INDEX "SiteVisit_osName_idx" ON "SiteVisit"("osName");
