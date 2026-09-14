import type {GeneratedQuestion, GradeResult} from '@/lib/types';
import {CHEAP_ANTHROPIC_MODEL, useStubs} from '@/lib/config';
import {gradeTranscriptLocally, RUBRIC_CRITERIA} from '@/lib/grading';
import {
  analyzeCvLocally,
  assembleInterviewSet,
  type CvAnalysis,
  type CvPageImage,
} from '@/lib/cv-parse';
import {
  buildAnswerCriteria,
  type JobDescriptionAnalysis,
} from '@/lib/criteria';
import {evaluateCvEvidence} from '@/lib/cv-evidence';
import {
  llmTrackGuidance,
  parseDesignProcessStance,
  parseOrgPace,
  resolveInterviewTrack,
  type DesignProcessStance,
  type OrgPace,
} from '@/lib/interview/tracks';
import {
  applyPracticeMemoryToQuestions,
  llmPracticeMemoryGuidance,
  type PracticeMemory,
} from '@/lib/interview/practice-memory';
import {
  attachPersonas,
  draftExecRoundQuestions,
  draftTeamRoundQuestions,
  llmRoundGuidance,
  parseInterviewRound,
  pickExecPersona,
  questionCountForRound,
  type ExecPersona,
  type InterviewRound,
} from '@/lib/interview/rounds';

export async function analyzeCvBuffer(
  fileName: string,
  pdfText: string,
): Promise<CvAnalysis> {
  const local = analyzeCvLocally(pdfText);

  if (!pdfText.trim()) {
    return {
      ...local,
      parsed_text: `Could not extract text from ${fileName}.`,
      skills_extracted: [],
    };
  }

  if (useStubs()) {
    return local;
  }

  // With Anthropic: refine skills/years from the extracted PDF text (cheap Haiku).
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CHEAP_ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Extract design CV insights from this CV text.
Return ONLY JSON: {"skills_extracted":["..."],"experience_years":number,"projects":["..."],"companies":["..."],"roles":["..."]}

CV text:
${pdfText.slice(0, 6000)}`,
          },
        ],
      }),
    });

    if (!response.ok) return local;

    const data = (await response.json()) as {
      content: Array<{type: string; text?: string}>;
    };
    const text = data.content.find((c) => c.type === 'text')?.text ?? '{}';
    const parsed = JSON.parse(text) as Partial<CvAnalysis>;
    return {
      parsed_text: local.parsed_text,
      skills_extracted:
        parsed.skills_extracted?.length
          ? parsed.skills_extracted
          : local.skills_extracted,
      experience_years:
        parsed.experience_years ?? local.experience_years,
      projects: parsed.projects?.length ? parsed.projects : local.projects,
      companies: parsed.companies?.length
        ? parsed.companies
        : local.companies,
      roles: parsed.roles?.length ? parsed.roles : local.roles,
    };
  } catch {
    return local;
  }
}

/** Read CV copy from page screenshots when native PDF text is empty. */
export async function extractCvTextFromPageImages(
  images: CvPageImage[],
): Promise<string> {
  if (!images.length || useStubs()) return '';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return '';

  const content: Array<
    | {type: 'text'; text: string}
    | {
        type: 'image';
        source: {type: 'base64'; media_type: 'image/png' | 'image/jpeg'; data: string};
      }
  > = [
    {
      type: 'text',
      text: `This is a designer's CV as page images (often a designed PDF with no selectable text).
Transcribe ALL readable text in reading order: name, contact, roles, companies, dates, skills, project names, and bullet points.
Return plain text only. No markdown, no commentary.`,
    },
  ];

  for (const image of images.slice(0, 3)) {
    if (image.base64.length > 5_000_000) continue;
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mime,
        data: image.base64,
      },
    });
  }

  if (content.length < 2) return '';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CHEAP_ANTHROPIC_MODEL,
        max_tokens: 2500,
        messages: [{role: 'user', content}],
      }),
    });
    if (!response.ok) {
      console.error('[cv-vision]', response.status, await response.text());
      return '';
    }
    const data = (await response.json()) as {
      content: Array<{type: string; text?: string}>;
    };
    return (data.content.find((c) => c.type === 'text')?.text ?? '').trim();
  } catch (err) {
    console.error('[cv-vision]', err);
    return '';
  }
}

function trackQuestionContext(
  analysis: CvAnalysis,
  jd: JobDescriptionAnalysis | null,
  role: string | undefined,
  process: DesignProcessStance,
  orgPace: OrgPace,
) {
  return {
    skill: analysis.skills_extracted[0] ?? 'your core design craft',
    project: analysis.projects[0] ?? 'a recent project from your CV',
    company:
      jd?.company_name ?? analysis.companies[0] ?? 'your most recent company',
    role: jd?.role_title ?? role ?? analysis.roles[0] ?? 'your current role',
    years: analysis.experience_years
      ? `${analysis.experience_years} years`
      : 'your experience level',
    jdFocus: String(
      jd?.requirements[0] ??
        jd?.keywords[0] ??
        'the priorities in the job description',
    ),
    hasCompany: Boolean(jd?.company_name),
    hasJd: Boolean(jd?.raw_text?.trim()),
    jdWantsAi: Boolean(
      jd &&
        /\b(ai|llm|machine learning|copilot|chatgpt)\b/i.test(
          `${jd.raw_text} ${jd.requirements.join(' ')} ${jd.keywords.join(' ')}`,
        ),
    ),
    cvUsesAi: /\bai\b/i.test(analysis.parsed_text),
    process,
    orgPace,
    companyBrief: jd?.company_brief ?? null,
    skillGaps: jd?.skill_gaps ?? [],
  };
}

function questionsForRound(input: {
  round: InterviewRound;
  exec: ExecPersona;
  analysis: CvAnalysis;
  jd: JobDescriptionAnalysis | null;
  role?: string;
  process: DesignProcessStance;
  orgPace: OrgPace;
  memory: PracticeMemory | null;
  llmQuestions?: GeneratedQuestion[] | null;
  track: ReturnType<typeof resolveInterviewTrack>;
}): GeneratedQuestion[] {
  const ctx = trackQuestionContext(
    input.analysis,
    input.jd,
    input.role,
    input.process,
    input.orgPace,
  );
  if (input.round === 2) {
    const drafted = draftTeamRoundQuestions(ctx, input.analysis, input.jd);
    const llm = input.llmQuestions?.filter(
      (question) => !/tell me about yourself/i.test(question.text),
    );
    const chosen =
      llm && llm.length >= 4 ? llm.slice(0, TEAM_OR_EXEC_LIMIT(2)) : drafted;
    return attachPersonas(
      applyPracticeMemoryToQuestions(chosen, input.memory),
      2,
      input.exec,
    );
  }
  if (input.round === 3) {
    const drafted = draftExecRoundQuestions(
      input.exec,
      ctx,
      input.analysis,
      input.jd,
    );
    const llm = input.llmQuestions?.filter(
      (question) => !/tell me about yourself/i.test(question.text),
    );
    const chosen =
      llm && llm.length >= 3 ? llm.slice(0, TEAM_OR_EXEC_LIMIT(3)) : drafted;
    return attachPersonas(
      applyPracticeMemoryToQuestions(chosen, input.memory),
      3,
      input.exec,
    );
  }
  return attachPersonas(
    assembleInterviewSet(
      input.analysis,
      input.jd,
      input.llmQuestions,
      input.track,
      input.process,
      input.orgPace,
      input.memory,
    ),
    1,
    input.exec,
  );
}

function TEAM_OR_EXEC_LIMIT(round: InterviewRound): number {
  return questionCountForRound(round);
}

export async function generateQuestions(input: {
  cvText?: string | null;
  company?: string;
  role?: string;
  analysis?: CvAnalysis | null;
  jd?: JobDescriptionAnalysis | null;
  trackId?: string | null;
  processStance?: DesignProcessStance | null;
  orgPace?: OrgPace | null;
  practiceMemory?: PracticeMemory | null;
  round?: InterviewRound | number | null;
}): Promise<GeneratedQuestion[]> {
  const analysis = input.analysis ?? analyzeCvLocally(input.cvText ?? '');
  const jd =
    input.jd ??
    (input.company || input.role
      ? {
          raw_text: '',
          role_title: input.role ?? null,
          company_name: input.company ?? null,
          requirements: [],
          responsibilities: [],
          keywords: [],
        }
      : null);
  const track = resolveInterviewTrack({
    trackId: input.trackId,
    roleTitle: jd?.role_title ?? input.role,
  });
  const stance = parseDesignProcessStance(input.processStance);
  const orgPace = parseOrgPace(input.orgPace);
  const memory = input.practiceMemory ?? null;
  const round = parseInterviewRound(input.round);
  const exec = pickExecPersona({
    orgPace,
    processStance: stance,
    trackFamily: track?.family,
    jdText: jd?.raw_text,
  });
  const enrichedAnalysis = {
    ...analysis,
    companies: input.company
      ? [input.company, ...analysis.companies]
      : analysis.companies,
    roles: input.role ? [input.role, ...analysis.roles] : analysis.roles,
  };

  if (useStubs()) {
    return questionsForRound({
      round,
      exec,
      analysis: enrichedAnalysis,
      jd,
      role: input.role,
      process: stance,
      orgPace,
      memory,
      track,
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CHEAP_ANTHROPIC_MODEL,
        max_tokens: 2500,
      messages: [
        {
          role: 'user',
          content: `You are a design interview coach writing a realistic spoken interview.
${
  round === 1
    ? `Write a realistic 10-question spoken interview.
The first 5 must be classic openers (personalised with CV/company names):
1. Tell me about yourself
2. If a real company/JD is present: Why are you applying for THIS role at THIS company. If not: why this kind of role.
3. Strengths and a genuine weakness
4. A conflict you’ve dealt with
5. If a real company is present: What do you know about us? Ground it in the company brief. If not: where do you see yourself in five years.
Then 5 CV-grounded craft questions for THIS target role. Include exactly one about using AI in that craft (tools, judgement of output, what stays human). If the CV mentions AI, ground that question in their work. If not, use a realistic template tied to a project on the CV.
If a job description is provided, tailor JD-fit and 90-days questions to it. If skill gaps are listed, one question MUST be a real interviewer challenge: the CV is lighter on that requirement than the spec — how do they still make the case.
Return persona "hirer" on every question.`
    : llmRoundGuidance(round, exec)
}
${llmTrackGuidance(track, stance, orgPace)}
${llmPracticeMemoryGuidance(memory)}

Skills: ${analysis.skills_extracted.join(', ')}
Projects: ${analysis.projects.join(' | ')}
Companies: ${analysis.companies.join(', ')}
Roles: ${analysis.roles.join(', ')}
Target role: ${track?.label ?? jd?.role_title ?? input.role ?? 'n/a'}
JD role: ${jd?.role_title ?? input.role ?? 'n/a'}
JD company: ${jd?.company_name ?? input.company ?? 'n/a'}
JD requirements: ${(jd?.requirements ?? []).join(' | ')}
JD keywords: ${(jd?.keywords ?? []).join(', ')}
Company brief: ${(jd?.company_brief ?? '').slice(0, 800) || 'n/a'}
CV vs JD gaps: ${(jd?.skill_gaps ?? []).join(' | ') || 'none obvious'}
CV excerpt: ${(input.cvText ?? analysis.parsed_text).slice(0, 1500)}

Return ONLY JSON:
{"questions":[{"text":"...","category":"ux_process","is_personal":true,"persona":"hirer"}]}`,
        },
      ],
    }),
  });

  const fallback = () =>
    questionsForRound({
      round,
      exec,
      analysis: enrichedAnalysis,
      jd,
      role: input.role,
      process: stance,
      orgPace,
      memory,
      track,
    });

  if (!response.ok) {
    return fallback();
  }

  const data = (await response.json()) as {
    content: Array<{type: string; text?: string}>;
  };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '{}';
  try {
    const parsed = JSON.parse(text) as {questions: GeneratedQuestion[]};
    if (parsed.questions?.length) {
      const mapped = parsed.questions.map((q) => ({
        ...q,
        criteria:
          q.criteria ??
          buildAnswerCriteria({
            questionText: q.text,
            category: q.category,
            isPersonal: q.is_personal,
            cv: analysis,
            jd,
          }),
      }));
      return questionsForRound({
        round,
        exec,
        analysis: enrichedAnalysis,
        jd,
        role: input.role,
        process: stance,
        orgPace,
        memory,
        llmQuestions: mapped,
        track,
      });
    }
  } catch {
    // fall through
  }
  return fallback();
}

export async function gradeAnswer(input: {
  questionText: string;
  transcription: string;
  criteria?: import('@/lib/criteria').AnswerCriteria | null;
  cv?: import('@/lib/cv-parse').CvAnalysis | null;
  isPersonal?: boolean;
}): Promise<GradeResult> {
  if (useStubs()) {
    return gradeTranscriptLocally(input);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const criteria = input.criteria;
  const cvTargets =
    input.cv && input.isPersonal
      ? [
          ...input.cv.projects.slice(0, 4),
          ...input.cv.companies.slice(0, 3),
        ].join(' | ')
      : input.cv?.companies.slice(0, 2).join(' | ') ?? '';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CHEAP_ANTHROPIC_MODEL,
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: `You are a senior design interviewer giving a debrief after a stressful spoken interview.

Be direct and human. If they did well, say so clearly. If they were thin, say what would fail in the room and how to fix it — not a pep talk that hides the gap.

Score against:
1) The interview question (kind: ${criteria?.kind ?? 'craft'})
2) Axes 0-10: designThinking, communication, depth, knowledge, roleFit
3) Personalized criteria:
Must cover: ${(criteria?.mustCover ?? []).join(' | ')}
Strong signals: ${(criteria?.strongSignals ?? []).join(' | ')}
Weak signals (penalize): ${(criteria?.weakSignals ?? []).join(' | ')}
JD keywords: ${(criteria?.roleKeywords ?? []).join(', ')}
CV evidence to cite (projects / employers): ${cvTargets || 'n/a'}
Personal question: ${input.isPersonal ? 'yes — penalize generic answers without CV specifics' : 'no'}

Question: ${input.questionText}
Transcript: ${input.transcription}

"feedback" should be 2–4 spoken sentences: verdict first, then one concrete improvement (or none if they nailed it).

Return ONLY JSON matching:
{
  "score": 0-100,
  "scoreBreakdown": {"designThinking":0,"communication":0,"depth":0,"knowledge":0,"roleFit":0},
  "feedback": "...",
  "strengths": [],
  "improvements": [],
  "evaluatedAgainst": {
    "question": "...",
    "answerExcerpt": "...",
    "criteria": ${JSON.stringify([...RUBRIC_CRITERIA])},
    "mustCover": [],
    "mustCoverHit": [],
    "mustCoverMissed": [],
    "strongSignalsHit": [],
    "weakSignalsHit": [],
    "roleKeywordsHit": [],
    "cvEvidenceHit": [],
    "cvEvidenceMissed": []
  }
}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic grading failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{type: string; text?: string}>;
  };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '{}';
  const parsed = JSON.parse(text) as GradeResult;
  const localCvEvidence =
    input.cv && input.isPersonal !== undefined
      ? evaluateCvEvidence({
          transcription: input.transcription,
          cv: input.cv,
          isPersonal: input.isPersonal,
        })
      : null;
  const evaluatedAgainst = {
    ...(parsed.evaluatedAgainst ?? {
      question: input.questionText,
      answerExcerpt: input.transcription.slice(0, 280),
      criteria: [...RUBRIC_CRITERIA],
      mustCover: criteria?.mustCover ?? [],
      mustCoverHit: [],
      mustCoverMissed: criteria?.mustCover ?? [],
      strongSignalsHit: [],
      weakSignalsHit: [],
      roleKeywordsHit: [],
    }),
    cvEvidenceHit:
      parsed.evaluatedAgainst?.cvEvidenceHit?.length
        ? parsed.evaluatedAgainst.cvEvidenceHit
        : (localCvEvidence?.hit ?? []),
    cvEvidenceMissed:
      parsed.evaluatedAgainst?.cvEvidenceMissed?.length
        ? parsed.evaluatedAgainst.cvEvidenceMissed
        : (localCvEvidence?.missed ?? []),
  };
  return {
    ...parsed,
    scoreBreakdown: {
      designThinking: parsed.scoreBreakdown?.designThinking ?? 5,
      communication: parsed.scoreBreakdown?.communication ?? 5,
      depth: parsed.scoreBreakdown?.depth ?? 5,
      knowledge: parsed.scoreBreakdown?.knowledge ?? 5,
      roleFit: parsed.scoreBreakdown?.roleFit ?? 5,
    },
    evaluatedAgainst,
    stub: false,
  };
}
