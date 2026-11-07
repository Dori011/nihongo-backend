import { ContentProgressStatus, TestAttemptStatus } from '@prisma/client';

export const PROGRESS_KINDS = {
  KANJI: 'kanji',
  CUSTOM_KANJI: 'custom-kanji',
  VOCAB: 'vocab',
} as const;
export type ProgressKind = (typeof PROGRESS_KINDS)[keyof typeof PROGRESS_KINDS];

/** Mở / đọc không bao giờ làm tụt trạng thái. */
export function nextStatusOnEvent(
  current: ContentProgressStatus,
  event: 'open' | 'read',
): ContentProgressStatus {
  switch (current) {
    case ContentProgressStatus.NOT_VIEWED:
      return event === 'open'
        ? ContentProgressStatus.OPENED
        : ContentProgressStatus.VIEWING;
    case ContentProgressStatus.OPENED:
      return event === 'read' ? ContentProgressStatus.VIEWING : current;
    case ContentProgressStatus.INCOMPLETE:
      return ContentProgressStatus.IN_PROGRESS; // mở lại mục "cần xem lại"
    default:
      return current; // VIEWING, IN_PROGRESS, COMPLETED giữ nguyên
  }
}

/** Bài đang làm mà quá hạn thì coi như hết giờ. */
export function effectiveTestStatus(
  status: TestAttemptStatus,
  expiresAt: Date | null,
): TestAttemptStatus {
  if (
    status === TestAttemptStatus.IN_PROGRESS &&
    expiresAt &&
    expiresAt.getTime() < Date.now()
  ) {
    return TestAttemptStatus.EXPIRED;
  }
  return status;
}