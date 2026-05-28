-- CreateTable
CREATE TABLE "InitiativeNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "initiativeName" TEXT NOT NULL,
    "noteText" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiativeNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InitiativeNote_userId_initiativeName_key" ON "InitiativeNote"("userId", "initiativeName");

-- CreateIndex
CREATE UNIQUE INDEX "EventFeedback_userId_agendaEventId_key" ON "EventFeedback"("userId", "agendaEventId");

-- AddForeignKey
ALTER TABLE "InitiativeNote" ADD CONSTRAINT "InitiativeNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
