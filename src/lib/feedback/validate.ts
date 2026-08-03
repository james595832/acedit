import type {FeedbackCategory} from '@/lib/feedback/types';

export type FeedbackInput = {
  category?: string;
  message?: string;
  rating?: number | null;
  email?: string;
  page_path?: string;
  user_agent?: string;
  /** Honeypot — must be empty */
  _hp?: string;
};

export type FeedbackValidation =
  | {ok: true; data: {
      category: FeedbackCategory;
      message: string;
      rating: number | null;
      email: string;
      page_path: string | null;
      user_agent: string | null;
    }}
  | {ok: false; error: string; code: string};

const CATEGORIES = new Set<FeedbackCategory>([
  'feature',
  'bug',
  'performance',
  'general',
]);

export function validateFeedbackInput(
  body: FeedbackInput,
  sessionEmail: string | null,
): FeedbackValidation {
  if (body._hp?.trim()) {
    return {ok: false, error: 'Invalid submission', code: 'SPAM'};
  }

  const category = body.category as FeedbackCategory;
  if (!category || !CATEGORIES.has(category)) {
    return {
      ok: false,
      error: 'Choose a feedback type',
      code: 'VALIDATION_ERROR',
    };
  }

  const message = String(body.message ?? '').trim();
  if (message.length < 10) {
    return {
      ok: false,
      error: 'Tell us a bit more, at least 10 characters',
      code: 'VALIDATION_ERROR',
    };
  }
  if (message.length > 5000) {
    return {
      ok: false,
      error: 'Message is too long (max 5000 characters)',
      code: 'VALIDATION_ERROR',
    };
  }

  let rating: number | null = null;
  if (body.rating !== undefined && body.rating !== null) {
    const n = Number(body.rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return {
        ok: false,
        error: 'Rating must be between 1 and 5',
        code: 'VALIDATION_ERROR',
      };
    }
    rating = n;
  }

  const email = (sessionEmail ?? String(body.email ?? '').trim()).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      error: 'Add your email so we can follow up',
      code: 'VALIDATION_ERROR',
    };
  }

  return {
    ok: true,
    data: {
      category,
      message,
      rating,
      email,
      page_path: body.page_path?.trim().slice(0, 500) ?? null,
      user_agent: body.user_agent?.trim().slice(0, 500) ?? null,
    },
  };
}
