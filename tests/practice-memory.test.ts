import {describe, expect, it} from 'vitest';
import {
  applyPracticeMemoryToQuestions,
  buildPracticeMemory,
} from '@/lib/interview/practice-memory';

describe('practice memory', () => {
  it('keeps weak-spot coaching from a prior interview', () => {
    const memory = buildPracticeMemory([
      {
        sessionId: 's1',
        answers: [
          {
            score: 82,
            feedback: JSON.stringify({
              score: 82,
              improvements: [],
              feedback: 'Clear intro.',
            }),
            questionText: 'Tell me about yourself.',
            category: 'communication',
          },
          {
            score: 41,
            feedback: JSON.stringify({
              score: 41,
              improvements: [
                'Name the stakeholder and what you actually said.',
                'End with what changed after the conflict.',
              ],
              feedback: 'Too vague on the conflict.',
            }),
            questionText:
              'Tell me about a time you dealt with a conflict at work.',
            category: 'communication',
          },
        ],
      },
    ]);

    expect(memory).not.toBeNull();
    expect(memory?.overall).toBe(62);
    expect(memory?.focus[0]).toMatch(/stakeholder/i);
    expect(memory?.weakKinds).toContain('conflict');
  });

  it('deepens the matching question on a retake', () => {
    const memory = buildPracticeMemory([
      {
        sessionId: 's1',
        answers: [
          {
            score: 38,
            feedback: JSON.stringify({
              score: 38,
              improvements: ['Add one CV example and an outcome.'],
            }),
            questionText:
              'At Northloop as Product designer, how did you handle a conflict between stakeholder requests and user evidence?',
            category: 'communication',
          },
        ],
      },
    ]);

    const next = applyPracticeMemoryToQuestions(
      [
        {
          text: 'At Civic Labs as Product designer, how did you handle a conflict between stakeholder requests and user evidence?',
          category: 'communication',
          is_personal: true,
        },
      ],
      memory,
    );

    expect(next[0]?.text).toMatch(/go deeper than last time/i);
    expect(next[0]?.text).toMatch(/cv example/i);
  });

  it('ignores a strong interview with no weak answers', () => {
    const memory = buildPracticeMemory([
      {
        sessionId: 's1',
        answers: [
          {
            score: 88,
            feedback: JSON.stringify({score: 88, improvements: []}),
            questionText: 'Tell me about yourself.',
            category: 'communication',
          },
        ],
      },
    ]);
    expect(memory).toBeNull();
  });
});
