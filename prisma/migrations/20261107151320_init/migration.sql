-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContentProgressStatus" AS ENUM ('NOT_VIEWED', 'OPENED', 'VIEWING', 'IN_PROGRESS', 'INCOMPLETE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TestAttemptStatus" AS ENUM ('NOT_OPENED', 'OPENED', 'IN_PROGRESS', 'INCOMPLETE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('JLPT_MOCK', 'KANJI_TEST', 'VOCABULARY_TEST', 'COMBINED_TEST', 'DAILY_VOCAB_TEST');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DAILY_LOGIN', 'DAILY_VOCAB_COMPLETE', 'SYSTEM_KANJI_BATCH_5', 'TEST_COMPLETION', 'TEST_SCORE_BONUS', 'AI_SENTENCE_DEDUCT', 'AI_SENTENCE_REFUND', 'AI_SENTENCE_REWARD', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('SYSTEM', 'TEST', 'AI', 'VOCAB', 'KANJI', 'ADMIN');

-- CreateEnum
CREATE TYPE "JLPTLevel" AS ENUM ('N5', 'N4', 'N3');

-- CreateEnum
CREATE TYPE "SelfReview" AS ENUM ('UNRATED', 'UNDERSTOOD', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('OPEN_KANJI', 'OPEN_VOCAB', 'COMPLETE_KANJI', 'COMPLETE_VOCAB', 'REVIEW_MARK', 'OPEN_TEST', 'COMPLETE_TEST', 'DAILY_LOGIN');

-- CreateTable
CREATE TABLE "Whitelist" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "bambooBalance" INTEGER NOT NULL DEFAULT 10,
    "lastLoginDate" TIMESTAMP(3),
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemKanji" (
    "id" TEXT NOT NULL,
    "kanji" TEXT NOT NULL,
    "hanViet" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL,
    "onyomi" TEXT NOT NULL,
    "kunyomi" TEXT NOT NULL,
    "strokeCount" INTEGER NOT NULL,
    "radical" TEXT NOT NULL,
    "strokeOrderSvg" TEXT,
    "readings" TEXT NOT NULL,
    "compounds" JSONB NOT NULL,
    "exampleJa" TEXT NOT NULL,
    "exampleVi" TEXT NOT NULL,
    "level" "JLPTLevel" NOT NULL DEFAULT 'N5',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemKanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKanji" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kanji" TEXT NOT NULL,
    "hanViet" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL,
    "onyomi" TEXT NOT NULL,
    "kunyomi" TEXT NOT NULL,
    "strokeCount" INTEGER,
    "radical" TEXT,
    "strokeOrderSvg" TEXT,
    "compounds" JSONB,
    "exampleJa" TEXT,
    "exampleVi" TEXT,
    "level" "JLPTLevel" NOT NULL DEFAULT 'N5',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKanjiProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kanjiId" TEXT NOT NULL,
    "status" "ContentProgressStatus" NOT NULL DEFAULT 'NOT_VIEWED',
    "firstOpenedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "selfReview" "SelfReview" NOT NULL DEFAULT 'UNRATED',
    "reviewedAt" TIMESTAMP(3),
    "rewardCounted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKanjiProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCustomKanjiProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userKanjiId" TEXT NOT NULL,
    "status" "ContentProgressStatus" NOT NULL DEFAULT 'NOT_VIEWED',
    "firstOpenedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "selfReview" "SelfReview" NOT NULL DEFAULT 'UNRATED',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCustomKanjiProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" TEXT NOT NULL,
    "kanji" TEXT,
    "hiragana" TEXT NOT NULL,
    "romaji" TEXT,
    "meaningVi" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL,
    "exampleJa" TEXT NOT NULL,
    "exampleVi" TEXT NOT NULL,
    "level" "JLPTLevel" NOT NULL DEFAULT 'N5',
    "topic" TEXT NOT NULL DEFAULT 'General',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVocabProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabId" TEXT NOT NULL,
    "status" "ContentProgressStatus" NOT NULL DEFAULT 'NOT_VIEWED',
    "firstOpenedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "selfReview" "SelfReview" NOT NULL DEFAULT 'UNRATED',
    "reviewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVocabProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyVocabSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateString" TEXT NOT NULL,
    "level" "JLPTLevel" NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyVocabSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyVocabItem" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "vocabId" TEXT NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "DailyVocabItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "TestType" NOT NULL,
    "level" "JLPTLevel" NOT NULL,
    "timeLimit" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "passScore" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "orderIndex" INTEGER NOT NULL,
    "questionType" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "acceptableAnswers" JSONB,
    "explanation" TEXT,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "status" "TestAttemptStatus" NOT NULL DEFAULT 'NOT_OPENED',
    "scoreTotal" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" JSONB,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isRewarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userResponse" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "scoreEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentenceSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "correctedText" TEXT,
    "errorLocations" JSONB,
    "errorType" TEXT,
    "explanationVi" TEXT,
    "naturalVariants" JSONB,
    "similarExamples" JSONB,
    "overallReview" TEXT,
    "isValidJapanese" BOOLEAN NOT NULL DEFAULT false,
    "isRewarded" BOOLEAN NOT NULL DEFAULT false,
    "feeCharged" INTEGER NOT NULL DEFAULT 2,
    "rewardAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentenceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BambooTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "source" "TransactionSource" NOT NULL,
    "relatedEntityId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BambooTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "label" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Whitelist_identifier_key" ON "Whitelist"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "SystemKanji_kanji_key" ON "SystemKanji"("kanji");

-- CreateIndex
CREATE INDEX "SystemKanji_level_idx" ON "SystemKanji"("level");

-- CreateIndex
CREATE INDEX "UserKanji_userId_isDeleted_idx" ON "UserKanji"("userId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "UserKanji_userId_kanji_key" ON "UserKanji"("userId", "kanji");

-- CreateIndex
CREATE INDEX "UserKanjiProgress_userId_status_idx" ON "UserKanjiProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "UserKanjiProgress_userId_selfReview_idx" ON "UserKanjiProgress"("userId", "selfReview");

-- CreateIndex
CREATE INDEX "UserKanjiProgress_userId_rewardCounted_idx" ON "UserKanjiProgress"("userId", "rewardCounted");

-- CreateIndex
CREATE UNIQUE INDEX "UserKanjiProgress_userId_kanjiId_key" ON "UserKanjiProgress"("userId", "kanjiId");

-- CreateIndex
CREATE INDEX "UserCustomKanjiProgress_userId_status_idx" ON "UserCustomKanjiProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "UserCustomKanjiProgress_userId_selfReview_idx" ON "UserCustomKanjiProgress"("userId", "selfReview");

-- CreateIndex
CREATE UNIQUE INDEX "UserCustomKanjiProgress_userId_userKanjiId_key" ON "UserCustomKanjiProgress"("userId", "userKanjiId");

-- CreateIndex
CREATE INDEX "Vocabulary_level_topic_idx" ON "Vocabulary"("level", "topic");

-- CreateIndex
CREATE INDEX "UserVocabProgress_userId_status_idx" ON "UserVocabProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "UserVocabProgress_userId_selfReview_idx" ON "UserVocabProgress"("userId", "selfReview");

-- CreateIndex
CREATE UNIQUE INDEX "UserVocabProgress_userId_vocabId_key" ON "UserVocabProgress"("userId", "vocabId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyVocabSet_userId_dateString_level_key" ON "DailyVocabSet"("userId", "dateString", "level");

-- CreateIndex
CREATE UNIQUE INDEX "DailyVocabItem_setId_vocabId_key" ON "DailyVocabItem"("setId", "vocabId");

-- CreateIndex
CREATE INDEX "Test_type_level_isPublished_idx" ON "Test"("type", "level", "isPublished");

-- CreateIndex
CREATE INDEX "TestQuestion_testId_orderIndex_idx" ON "TestQuestion"("testId", "orderIndex");

-- CreateIndex
CREATE INDEX "TestAttempt_userId_testId_status_idx" ON "TestAttempt"("userId", "testId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TestAnswer_attemptId_questionId_key" ON "TestAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "SentenceSubmission_idempotencyKey_key" ON "SentenceSubmission"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SentenceSubmission_userId_contentHash_idx" ON "SentenceSubmission"("userId", "contentHash");

-- CreateIndex
CREATE INDEX "SentenceSubmission_userId_createdAt_idx" ON "SentenceSubmission"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BambooTransaction_idempotencyKey_key" ON "BambooTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BambooTransaction_userId_createdAt_idx" ON "BambooTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BambooTransaction_type_idx" ON "BambooTransaction"("type");

-- CreateIndex
CREATE INDEX "BambooTransaction_source_idx" ON "BambooTransaction"("source");

-- CreateIndex
CREATE INDEX "AdminLog_adminId_createdAt_idx" ON "AdminLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLog_targetUserId_createdAt_idx" ON "AdminLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserKanji" ADD CONSTRAINT "UserKanji_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKanjiProgress" ADD CONSTRAINT "UserKanjiProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKanjiProgress" ADD CONSTRAINT "UserKanjiProgress_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "SystemKanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCustomKanjiProgress" ADD CONSTRAINT "UserCustomKanjiProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCustomKanjiProgress" ADD CONSTRAINT "UserCustomKanjiProgress_userKanjiId_fkey" FOREIGN KEY ("userKanjiId") REFERENCES "UserKanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabProgress" ADD CONSTRAINT "UserVocabProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabProgress" ADD CONSTRAINT "UserVocabProgress_vocabId_fkey" FOREIGN KEY ("vocabId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyVocabSet" ADD CONSTRAINT "DailyVocabSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyVocabItem" ADD CONSTRAINT "DailyVocabItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "DailyVocabSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyVocabItem" ADD CONSTRAINT "DailyVocabItem_vocabId_fkey" FOREIGN KEY ("vocabId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAnswer" ADD CONSTRAINT "TestAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAnswer" ADD CONSTRAINT "TestAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TestQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceSubmission" ADD CONSTRAINT "SentenceSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BambooTransaction" ADD CONSTRAINT "BambooTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
