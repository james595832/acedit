export type FeedbackCategory =
  | 'feature'
  | 'bug'
  | 'performance'
  | 'general';

export type FeedbackSubmission = {
  id: string;
  user_id: string | null;
  email: string;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  page_path: string | null;
  user_agent: string | null;
  created_at: string;
};

export const FEEDBACK_CATEGORY_LABELS: Record<
  FeedbackCategory,
  {label: string; hint: string}
> = {
  feature: {
    label: 'Feature idea',
    hint: 'Something you wish ACED-IT could do',
  },
  bug: {
    label: 'Bug or issue',
    hint: 'Something broken or confusing',
  },
  performance: {
    label: 'Performance',
    hint: 'Slow loads, failed uploads, grading delays',
  },
  general: {
    label: 'General feedback',
    hint: 'Anything else — we read every note',
  },
};
