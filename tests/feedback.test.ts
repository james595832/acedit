import {describe, expect, it} from 'vitest';
import {validateFeedbackInput} from '@/lib/feedback/validate';

describe('feedback validation', () => {
  it('accepts valid feedback with session email', () => {
    const result = validateFeedbackInput(
      {
        category: 'feature',
        message: 'Please add portfolio PDF export for case studies.',
        rating: 4,
        page_path: '/studio',
      },
      'designer@example.com',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.category).toBe('feature');
      expect(result.data.email).toBe('designer@example.com');
      expect(result.data.rating).toBe(4);
    }
  });

  it('requires email when not signed in', () => {
    const result = validateFeedbackInput(
      {
        category: 'bug',
        message: 'The grade button spins forever on Safari.',
      },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('rejects honeypot spam', () => {
    const result = validateFeedbackInput(
      {
        category: 'general',
        message: 'Buy cheap watches online now!!!',
        email: 'spam@evil.com',
        _hp: 'filled',
      },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('SPAM');
  });

  it('requires minimum message length', () => {
    const result = validateFeedbackInput(
      {
        category: 'performance',
        message: 'Too slow',
        email: 'user@example.com',
      },
      null,
    );
    expect(result.ok).toBe(false);
  });
});
