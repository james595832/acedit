import {beforeAll, describe, expect, it} from 'vitest';
import {
  createSession,
  deleteSession,
  getSession,
  getSessionQuestions,
  listAnswersForQuestions,
  listSessions,
  saveAnswer,
  saveCv,
} from '@/lib/store';

process.env.USE_STUBS = 'true';
delete process.env.SUPABASE_SERVICE_KEY;

const OWNER = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';

describe('delete interview session', () => {
  beforeAll(() => {
    process.env.USE_STUBS = 'true';
    delete process.env.SUPABASE_SERVICE_KEY;
  });

  it('removes the session, questions, and answers for the owner only', async () => {
    const cv = await saveCv(
      {
        file_name: 'delete-test.pdf',
        file_url: 'cv://test/delete-test.pdf',
        parsed_text: 'Product designer at Nova.',
        skills_extracted: ['Figma'],
        experience_years: 4,
      },
      OWNER,
    );

    const {session, questions} = await createSession(
      {
        cv_id: cv.id,
        interview_type: 'practice',
        questions: [
          {
            text: 'Tell me about yourself.',
            category: 'communication',
            is_personal: true,
          },
        ],
      },
      OWNER,
    );

    await saveAnswer(
      {
        question_id: questions[0].id,
        audio_url: null,
        transcription: 'I led onboarding at Nova.',
        duration_seconds: 12,
      },
      OWNER,
    );

    const stolen = await deleteSession(session.id, OTHER);
    expect(stolen).toBe(false);
    expect(await getSession(session.id, OWNER)).not.toBeNull();

    const deleted = await deleteSession(session.id, OWNER);
    expect(deleted).toBe(true);
    expect(await getSession(session.id, OWNER)).toBeNull();
    expect(await getSessionQuestions(session.id)).toEqual([]);
    expect(
      await listAnswersForQuestions(
        questions.map((q) => q.id),
        OWNER,
      ),
    ).toEqual([]);
    expect((await listSessions(OWNER)).some((row) => row.id === session.id)).toBe(
      false,
    );
  });
});
