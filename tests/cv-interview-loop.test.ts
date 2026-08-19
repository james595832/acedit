import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {beforeAll, describe, expect, it} from 'vitest';
import {
  analyzeCvLocally,
  buildQuestionsFromCv,
  cvUsesAi,
  extractCvDocument,
  extractPdfContent,
  MIN_USEFUL_CV_CHARS,
} from '@/lib/cv-parse';
import {generateQuestions} from '@/lib/ai';
import {analyzeJobDescriptionText} from '@/lib/criteria';
import {
  createSession,
  getCv,
  getSessionQuestions,
  saveCv,
} from '@/lib/store';

process.env.USE_STUBS = 'true';
delete process.env.SUPABASE_SERVICE_KEY;

const TEST_USER = '11111111-1111-4111-8111-111111111111';
const JAMES_DOCX = 'James_Reilly_CV.docx';

describe('CV read → store → interview', () => {
  beforeAll(() => {
    process.env.USE_STUBS = 'true';
    delete process.env.SUPABASE_SERVICE_KEY;
  });

  it(
    'reads Jane’s PDF, stores the CV, and starts a 10-question interview with an AI prompt',
    async () => {
    const bytes = await readFile('user-testing/personas/jane/cv.pdf');
    const extracted = await extractPdfContent(bytes);
    expect(extracted.text.length).toBeGreaterThan(MIN_USEFUL_CV_CHARS);
    expect(extracted.text).toMatch(/Jane Okonkwo/i);

    const analysis = analyzeCvLocally(extracted.text);
    expect(analysis.skills_extracted).toEqual(
      expect.arrayContaining(['Figma', 'Prototyping']),
    );
    expect(cvUsesAi(analysis)).toBe(false);

    const stored = await saveCv(
      {
        file_name: 'jane.pdf',
        file_url: 'cv://test/jane.pdf',
        parsed_text: analysis.parsed_text,
        skills_extracted: analysis.skills_extracted,
        experience_years: analysis.experience_years ?? 0,
      },
      TEST_USER,
    );
    const reloaded = await getCv(stored.id, TEST_USER);
    expect(reloaded?.parsed_text).toMatch(/Jane Okonkwo/i);
    expect(reloaded?.skills_extracted.length).toBeGreaterThan(0);

    const questions = await generateQuestions({
      cvText: reloaded?.parsed_text,
      analysis,
      jd: null,
    });
    expect(questions).toHaveLength(10);
    expect(questions[0]?.text).toMatch(/tell me about yourself/i);
    expect(questions[1]?.text).toMatch(/why this kind of product-design role/i);
    expect(questions.some((q) => /\bai\b/i.test(q.text))).toBe(true);
    expect(
      questions.some((q) => /housing|figma|northloop|civic/i.test(q.text)),
    ).toBe(true);

    const {session, questions: storedQs} = await createSession(
      {
        cv_id: stored.id,
        interview_type: 'practice',
        questions,
      },
      TEST_USER,
    );
    const fromDb = await getSessionQuestions(session.id);
    expect(fromDb).toHaveLength(10);
    expect(storedQs[0]?.question_text).toBe(questions[0]?.text);
    },
    60_000,
  );

  it('reads a Word CV and grounds the AI question in that work when no JD is given', async () => {
    const bytes = await readFile('tests/fixtures/ai-designer.docx');
    const extracted = await extractCvDocument(
      'ai-designer.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      bytes,
    );
    expect(extracted.kind).toBe('docx');
    expect(extracted.text.length).toBeGreaterThan(MIN_USEFUL_CV_CHARS);
    expect(extracted.text).toMatch(/Alex Chen/i);
    expect(extracted.text).toMatch(/Claude/i);

    const analysis = analyzeCvLocally(extracted.text);
    expect(cvUsesAi(analysis)).toBe(true);
    expect(analysis.skills_extracted).toEqual(
      expect.arrayContaining(['Claude']),
    );

    const questions = buildQuestionsFromCv(analysis, null);
    expect(questions).toHaveLength(10);
    const ai = questions.find((q) => /\bai\b/i.test(q.text));
    expect(ai?.is_personal).toBe(true);
    expect(ai?.text).toMatch(/your CV shows AI/i);
    expect(ai?.text).toMatch(/Northloop/i);
  });

  it.skipIf(!existsSync(JAMES_DOCX))(
    'reads James Reilly’s local Word CV (optional, not committed)',
    async () => {
      const bytes = await readFile(JAMES_DOCX);
      const extracted = await extractCvDocument(
        JAMES_DOCX,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        bytes,
      );
      expect(extracted.text.length).toBeGreaterThan(MIN_USEFUL_CV_CHARS);
      expect(extracted.text).toMatch(/James Reilly/i);
      const analysis = analyzeCvLocally(extracted.text);
      expect(cvUsesAi(analysis)).toBe(true);
      const ai = buildQuestionsFromCv(analysis, null).find((q) =>
        /\bai\b/i.test(q.text),
      );
      expect(ai?.text).toMatch(/your CV shows AI/i);
    },
  );

  it('uses a realistic AI template when the CV never mentions AI', () => {
    const analysis = analyzeCvLocally(
      'Jane Okonkwo\nProduct Design Intern - Northloop Health\nPROJECTS\nStudent Housing Finder\nSKILLS\nFigma - Prototyping',
    );
    const questions = buildQuestionsFromCv(analysis, null);
    const ai = questions.find((q) => /\bai\b/i.test(q.text));
    expect(ai?.text).toMatch(/where would you bring it in/i);
    expect(ai?.text).toMatch(/Housing|project/i);
  });

  it('ties the AI question to the JD when the spec asks for AI', () => {
    const analysis = analyzeCvLocally(
      'Jane Okonkwo\nProduct Design Intern - Northloop Health\nPROJECTS\nStudent Housing Finder\nSKILLS\nFigma - Prototyping',
    );
    const jd = analyzeJobDescriptionText(`
Junior Product Designer
Brightpath
Must be comfortable using AI and LLMs in the design workflow.
`);
    const questions = buildQuestionsFromCv(analysis, jd);
    const ai = questions.find((q) => /\bai\b/i.test(q.text));
    expect(ai?.text).toMatch(/this role/i);
    expect(ai?.text).toMatch(/expects AI/i);
  });
});
