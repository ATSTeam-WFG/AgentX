-- CreateIndex: userId on TriviaAnswer for fast per-user activity history lookups
CREATE INDEX "TriviaAnswer_userId_idx" ON "TriviaAnswer"("userId");

-- CreateIndex: userId on PointAdjustment for fast per-user adjustment history lookups
CREATE INDEX "PointAdjustment_userId_idx" ON "PointAdjustment"("userId");
