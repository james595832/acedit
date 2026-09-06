/** Client-side draft between “who you are” and “job” create steps. */

export const CREATE_INTERVIEW_DRAFT_KEY = 'aced-create-interview-draft';

export type CreateInterviewDraft = {
  cv_id?: string;
  target_track_id?: string;
  cv_file_name?: string;
};

export function readCreateDraft(): CreateInterviewDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CREATE_INTERVIEW_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CreateInterviewDraft;
  } catch {
    return null;
  }
}

export function writeCreateDraft(draft: CreateInterviewDraft): void {
  sessionStorage.setItem(CREATE_INTERVIEW_DRAFT_KEY, JSON.stringify(draft));
}

export function clearCreateDraft(): void {
  sessionStorage.removeItem(CREATE_INTERVIEW_DRAFT_KEY);
}

export const WELCOME_DONE_KEY = 'aced-welcome-done';

export function markWelcomeDone(): void {
  try {
    localStorage.setItem(WELCOME_DONE_KEY, '1');
  } catch {
    // ignore
  }
}

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_DONE_KEY) === '1';
  } catch {
    return false;
  }
}
