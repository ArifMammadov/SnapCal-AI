-- Add distance and steps support to activity_logs
ALTER TABLE "activity_logs" ADD COLUMN "distanceM" INTEGER;
ALTER TABLE "activity_logs" ALTER COLUMN "durationMin" DROP NOT NULL;
ALTER TABLE "activity_logs" ADD COLUMN "stepsCount" INTEGER;
