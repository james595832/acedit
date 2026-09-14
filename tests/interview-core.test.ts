import {describe, expect, it} from 'vitest';
import {evaluateCvEvidence, buildCvEvidenceTargets} from '@/lib/cv-evidence';
import {gradeTranscriptLocally} from '@/lib/grading';
import {recommendWhiteboardFromJd} from '@/lib/interview/format';
import {analyzeJobDescriptionText} from '@/lib/criteria';
import type {CvAnalysis} from '@/lib/cv-parse';

const CV: CvAnalysis = {
  parsed_text: 'Worked at Nova Banking on onboarding.',
  skills_extracted: ['Figma', 'UX Research'],
  experience_years: 5,
  projects: ['Nova Banking onboarding', 'HealthTrack dashboard'],
  companies: ['Nova Banking', 'HealthTrack'],
  roles: ['Senior Product Designer'],
};

describe('CV evidence grading', () => {
  it('detects cited projects in personal answers', () => {
    const result = evaluateCvEvidence({
      transcription:
        'At Nova Banking I led the onboarding redesign — we ran usability tests and shipped an 18% conversion lift.',
      cv: CV,
      isPersonal: true,
    });
    expect(result.hit.length).toBeGreaterThan(0);
    expect(result.hit.some((h) => /nova/i.test(h))).toBe(true);
  });

  it('flags missing CV evidence on personal answers', () => {
    const result = evaluateCvEvidence({
      transcription:
        'I always follow the double diamond and believe in user-centric design with strong collaboration.',
      cv: CV,
      isPersonal: true,
    });
    expect(result.missed.length).toBeGreaterThan(0);
  });

  it('builds evidence targets from CV', () => {
    const targets = buildCvEvidenceTargets(CV);
    expect(targets.some((t) => t.includes('Nova'))).toBe(true);
  });
});

describe('local grading', () => {
  it('grades substantive answers higher than empty ones', () => {
    const criteria = {
      mustCover: ['problem framing', 'research', 'decision to ship'],
      strongSignals: ['specific metric'],
      weakSignals: ['generic passion'],
      roleKeywords: ['fintech'],
      summary: 'Test rubric',
    };
    const strong = gradeTranscriptLocally({
      questionText: 'Tell me about a project',
      transcription:
        'For Nova Banking onboarding we defined the problem as KYC drop-off, interviewed users, explored three Figma prototypes, and shipped after usability testing — conversion up 18%.',
      criteria,
      cv: CV,
      isPersonal: true,
    });
    const weak = gradeTranscriptLocally({
      questionText: 'Tell me about a project',
      transcription: 'I am passionate about design.',
      criteria,
      cv: CV,
      isPersonal: true,
    });
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.evaluatedAgainst.cvEvidenceHit?.length ?? 0).toBeGreaterThan(0);
    expect(strong.feedback).toMatch(/land|solid|hiring manager/i);
    expect(weak.feedback).toMatch(/thin|wouldn’t carry|too short/i);
  });

  it('tells the candidate when a full intro would land', () => {
    const intro = gradeTranscriptLocally({
      questionText: 'Tell me about yourself. Walk me through your path as a designer.',
      transcription:
        'I’m currently a product designer focused on onboarding. Previously at Nova Banking I led the KYC flow — we interviewed users, cut drop-off, and shipped an 18% conversion lift. I’m looking for a team where I can keep doing that kind of evidence-led work.',
      cv: CV,
      isPersonal: true,
    });
    const waffle = gradeTranscriptLocally({
      questionText: 'Tell me about yourself. Walk me through your path as a designer.',
      transcription:
        'I am really passionate about design and putting users first. I love collaborating and I work too hard sometimes. I just want a great culture.',
      cv: CV,
      isPersonal: true,
    });
    expect(intro.score).toBeGreaterThan(waffle.score);
    expect(intro.feedback).toMatch(/land|solid/i);
  });
});

describe('CV vs JD gaps', () => {
  it('flags spec asks the CV does not show', async () => {
    const {findCvJdGaps} = await import('@/lib/interview/cv-jd-gap');
    const gaps = findCvJdGaps({
      cvText: 'Jane Okonkwo Product Designer Figma prototyping',
      skills: ['Figma', 'Prototyping'],
      requirements: ['Figma', 'Accessibility audits', 'SQL'],
      keywords: [],
    });
    expect(gaps.join(' ')).toMatch(/accessibility|sql/i);
    expect(gaps.some((gap) => /figma/i.test(gap))).toBe(false);
  });
});

describe('company name from URL', () => {
  it('reads the company from a careers host and skips filler labels', async () => {
    const {companyNameFromUrl} = await import(
      '@/lib/interview/company-from-url'
    );
    expect(companyNameFromUrl('https://www.anthropic.com')).toBe('Anthropic');
    expect(companyNameFromUrl('https://careers.figma.com/jobs')).toBe('Figma');
    expect(companyNameFromUrl('jobs.lever.co')).toBe('Lever');
  });
});

describe('interview host', () => {
  it('names the JD role when present, else a stock design role', async () => {
    const {interviewPositionLine} = await import('@/lib/interview/host');
    expect(
      interviewPositionLine({
        roleTitle: 'Junior Product Designer',
        companyName: 'Brightpath',
      }),
    ).toBe('Junior Product Designer at Brightpath');
    expect(interviewPositionLine({})).toBe('a product design role');
    expect(
      interviewPositionLine({roleTitle: 'Intern graphic designer'}),
    ).toBe('an Intern graphic designer role');
    expect(interviewPositionLine({roleTitle: 'UX researcher'})).toBe(
      'a UX researcher role',
    );
  });
});

describe('full interview set', () => {
  it('opens with classics then CV questions including AI', async () => {
    const {analyzeCvLocally, buildQuestionsFromCv} = await import('@/lib/cv-parse');
    const analysis = analyzeCvLocally(`
Jane Okonkwo
Product Design Intern - Northloop Health
PROJECTS
Student Housing Finder
SKILLS
Figma - Prototyping
`);
    const questions = buildQuestionsFromCv(analysis, null);
    expect(questions).toHaveLength(10);
    expect(questions[0]?.text).toMatch(/tell me about yourself/i);
    expect(questions[1]?.text).toMatch(/why this kind of product-design role/i);
    expect(questions[2]?.text).toMatch(/strengths/i);
    expect(questions[3]?.text).toMatch(/conflict/i);
    expect(questions[4]?.text).toMatch(/five years/i);
    expect(questions[0]?.criteria?.kind).toBe('intro');
    expect(questions.some((q) => q.criteria?.kind === 'ai')).toBe(true);
    expect(questions[2]?.criteria?.weakSignals.some((s) => /perfectionist/i.test(s))).toBe(
      true,
    );
  });
});

describe('interview debrief summary', () => {
  it('praises a strong run and names what to practise on a weak one', async () => {
    const {summarizeInterview} = await import('@/lib/interview/summary');
    const strong = summarizeInterview({
      overall: 82,
      answers: [
        {
          question: 'Tell me about yourself',
          score: 86,
          feedback: 'That would land.',
          strengths: ['Clear 90-second arc'],
          improvements: [],
        },
        {
          question: 'Walk through Housing Finder',
          score: 78,
          feedback: 'Solid project walkthrough.',
          strengths: ['Named the problem and the test'],
          improvements: ['Add a metric'],
        },
      ],
    });
    expect(strong?.headline).toMatch(/real interview/i);
    expect(strong?.wins.length).toBeGreaterThan(0);

    const weak = summarizeInterview({
      overall: 42,
      answers: [
        {
          question: 'Tell me about yourself',
          score: 40,
          feedback: 'Thin.',
          strengths: [],
          improvements: ['Name a CV project'],
        },
        {
          question: 'Conflict',
          score: 44,
          feedback: 'Blamed the PM.',
          strengths: [],
          improvements: ['State the other person’s view'],
        },
      ],
    });
    expect(weak?.headline).toMatch(/honest first pass/i);
    expect(weak?.next[0]).toMatch(/cv project|other person’s view/i);
  });
});

describe('target role tracks', () => {
  it('extracts intern graphic designer from the synthetic spec', async () => {
    const {getTrack} = await import('@/lib/interview/tracks');
    const {analyzeJobDescriptionText} = await import('@/lib/criteria');
    const track = getTrack('intern_graphic_designer');
    expect(track).toBeTruthy();
    const jd = analyzeJobDescriptionText(track!.syntheticJd);
    expect(jd.role_title).toMatch(/intern graphic designer/i);
  });

  it('asks intern graphic questions, not a product-design screen', async () => {
    const {analyzeCvLocally, buildQuestionsFromCv} = await import(
      '@/lib/cv-parse'
    );
    const {getTrack} = await import('@/lib/interview/tracks');
    const {analyzeJobDescriptionText} = await import('@/lib/criteria');
    const analysis = analyzeCvLocally(`
Maya Chen
Graphic Design Intern
PROJECTS
Campus festival poster
SKILLS
InDesign - Typography
`);
    const track = getTrack('intern_graphic_designer')!;
    const jd = analyzeJobDescriptionText(track.syntheticJd);
    const questions = buildQuestionsFromCv(analysis, jd, track);
    const blob = questions.map((q) => q.text).join('\n');
    expect(questions[1]?.text).toMatch(/intern graphic designer/i);
    expect(blob).toMatch(/brief/i);
    expect(blob).toMatch(/senior designer/i);
    expect(blob).not.toMatch(/product-design role/i);
    expect(blob).not.toMatch(/PM pushing/i);
    expect(blob).not.toMatch(/first 90 days/i);
    expect(blob).not.toMatch(/engineers and PMs/i);
  });

  it('asks UX researcher questions, not a PM shipping screen', async () => {
    const {analyzeCvLocally, buildQuestionsFromCv} = await import(
      '@/lib/cv-parse'
    );
    const {getTrack} = await import('@/lib/interview/tracks');
    const {analyzeJobDescriptionText} = await import('@/lib/criteria');
    const analysis = analyzeCvLocally(`
Sam Ortiz
UX Researcher - Civic Labs
PROJECTS
Housing waitlist study
SKILLS
User interviews - Synthesis
`);
    const track = getTrack('ux_researcher')!;
    const jd = analyzeJobDescriptionText(track.syntheticJd);
    const questions = buildQuestionsFromCv(analysis, jd, track);
    const blob = questions.map((q) => q.text).join('\n');
    expect(questions[1]?.text).toMatch(/UX research/i);
    expect(blob).toMatch(/method/i);
    expect(blob).toMatch(/research/i);
    expect(blob).not.toMatch(/PM pushing to ship an AI feature/i);
    expect(blob).not.toMatch(/product-design role/i);
  });

  it('keeps product-design wording when no JD and no track', async () => {
    const {analyzeCvLocally, buildQuestionsFromCv} = await import(
      '@/lib/cv-parse'
    );
    const analysis = analyzeCvLocally(`
Jane Okonkwo
Product Design Intern - Northloop Health
PROJECTS
Student Housing Finder
SKILLS
Figma - Prototyping
`);
    const questions = buildQuestionsFromCv(analysis, null);
    expect(questions[1]?.text).toMatch(/why this kind of product-design role/i);
    expect(questions.some((q) => /PM pushing|engineers and PMs/i.test(q.text))).toBe(
      true,
    );
  });

  it('asks prototype-first product questions when that process is chosen', async () => {
    const {analyzeCvLocally, buildQuestionsFromCv} = await import(
      '@/lib/cv-parse'
    );
    const {getTrack} = await import('@/lib/interview/tracks');
    const analysis = analyzeCvLocally(`
Jane Okonkwo
Product Designer - Northloop Health
PROJECTS
Student Housing Finder
SKILLS
Figma - Prototyping
`);
    const questions = buildQuestionsFromCv(
      analysis,
      null,
      getTrack('product_designer'),
      'prototype_first',
    );
    const blob = questions.map((q) => q.text).join('\n');
    expect(questions[1]?.text).toMatch(/working prototype/i);
    expect(blob).toMatch(/working prototype instead of finishing research/i);
    expect(blob).toMatch(/last-mile|scrappy version|learn in the product/i);
    expect(blob).not.toMatch(/PM pushing to ship an AI feature/i);
  });

  it('asks why you are applying, what you know about us, and a CV gap', async () => {
    const {analyzeCvLocally, buildQuestionsFromCv} = await import(
      '@/lib/cv-parse'
    );
    const {getTrack} = await import('@/lib/interview/tracks');
    const analysis = analyzeCvLocally(`
Jane Okonkwo
Product Designer - Northloop Health
PROJECTS
Student Housing Finder
SKILLS
Figma - Prototyping
`);
    const questions = buildQuestionsFromCv(
      analysis,
      {
        raw_text:
          'Job title: Product designer\nCompany: Anthropic\nRequirements:\n- Design systems\n- Accessibility audits\n- Figma',
        role_title: 'Product designer',
        company_name: 'Anthropic',
        requirements: ['Design systems', 'Accessibility audits', 'Figma'],
        responsibilities: [],
        keywords: ['accessibility', 'design systems'],
        company_brief:
          'Anthropic builds reliable, steerable AI systems. Claude is our consumer product.',
        skill_gaps: ['Accessibility audits'],
      },
      getTrack('product_designer'),
    );
    const blob = questions.map((q) => q.text).join('\n');
    expect(questions[1]?.text).toMatch(/why are you applying/i);
    expect(blob).toMatch(/what do you know about Anthropic/i);
    expect(blob).toMatch(/lighter on Accessibility audits/i);
    expect(blob).not.toMatch(/five years/i);
  });

  it('asks startup-pace questions when there is no job description', async () => {
    const {analyzeCvLocally, buildQuestionsFromCv} = await import(
      '@/lib/cv-parse'
    );
    const {getTrack} = await import('@/lib/interview/tracks');
    const analysis = analyzeCvLocally(`
Jane Okonkwo
Product Designer - Northloop Health
PROJECTS
Student Housing Finder
SKILLS
Figma - Prototyping
`);
    const questions = buildQuestionsFromCv(
      analysis,
      null,
      getTrack('product_designer'),
      'classic',
      'startup',
    );
    const blob = questions.map((q) => q.text).join('\n');
    expect(questions[1]?.text).toMatch(/startup/i);
    expect(blob).toMatch(/week one|first weeks|no handbook|little onboarding/i);
    expect(blob).toMatch(/founder|shipped this week/i);
  });
});

describe('JD whiteboard routing', () => {
  it('recommends whiteboard for case study JDs', () => {
    const jd = analyzeJobDescriptionText(`
      Product Designer
      On-site design challenge and whiteboard session required.
      Present a case study from your portfolio.
    `);
    const rec = recommendWhiteboardFromJd(jd);
    expect(rec.recommended).toBe(true);
    expect(rec.matchedTerms.length).toBeGreaterThan(0);
  });

  it('does not recommend whiteboard for generic JDs', () => {
    const jd = analyzeJobDescriptionText(`
      Product Designer — remote
      Requirements: Figma, research, collaboration with PM
    `);
    const rec = recommendWhiteboardFromJd(jd);
    expect(rec.recommended).toBe(false);
  });
});

describe('CV file kinds', () => {
  it('accepts pdf and docx, rejects old .doc', async () => {
    const {detectCvFileKind, analyzeCvLocally} = await import('@/lib/cv-parse');
    expect(detectCvFileKind('James.pdf', 'application/pdf')).toBe('pdf');
    expect(
      detectCvFileKind(
        'James.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('docx');
    expect(detectCvFileKind('James.doc')).toBe('unsupported');
    expect(analyzeCvLocally('').skills_extracted).toEqual([]);
    expect(
      analyzeCvLocally('Senior Product Designer · Figma · UX Research').skills_extracted,
    ).toEqual(expect.arrayContaining(['Figma', 'UX Research', 'Product Design']));
  });

  it('extracts selectable text from a normal CV PDF', async () => {
    const {readFile} = await import('node:fs/promises');
    const {extractPdfContent} = await import('@/lib/cv-parse');
    const bytes = await readFile('user-testing/personas/jane/cv.pdf');
    const extracted = await extractPdfContent(bytes);
    expect(extracted.text.length).toBeGreaterThan(400);
    expect(extracted.text).toMatch(/Jane Okonkwo/i);
  });
});
