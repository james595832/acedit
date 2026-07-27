import type {GeneratedQuestion, GradeResult} from '@/lib/types';
import {CHEAP_ANTHROPIC_MODEL, useStubs} from '@/lib/config';
import {gradeTranscriptLocally, RUBRIC_CRITERIA} from '@/lib/grading';
import {
  analyzeCvLocally,
  buildQuestionsFromCv,
  type CvAnalysis,
} from '@/lib/cv-parse';
import {
  buildAnswerCriteria,
  type JobDescriptionAnalysis,
} from '@/lib/criteria';

export async function analyzeCvBuffer(
  fileName: string,
  pdfText: string,
): Promise<CvAnalysis> {
  const local = analyzeCvLocally(pdfText);

  if (!pdfText.trim()) {
    return {
      ...local,
      parsed_text: `Could not extract text from ${fileName}. The PDF may be image-only — try a text-based export.`,
      skills_extracted: local.skills_extracted,
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

export async function generateQuestions(input: {
  cvText?: string | null;
  company?: string;
  role?: string;
  analysis?: CvAnalysis | null;
  jd?: JobDescriptionAnalysis | null;
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

  if (useStubs()) {
    return buildQuestionsFromCv(
      {
        ...analysis,
        companies: input.company
          ? [input.company, ...analysis.companies]
          : analysis.companies,
        roles: input.role ? [input.role, ...analysis.roles] : analysis.roles,
      },
      jd,
    );
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
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are a design interview coach. Generate exactly 8 interview questions.
3-4 must be personal and reference specific projects/skills/companies from the CV.
Tailor several to the job description when provided.

Skills: ${analysis.skills_extracted.join(', ')}
Projects: ${analysis.projects.join(' | ')}
Companies: ${analysis.companies.join(', ')}
Roles: ${analysis.roles.join(', ')}
JD role: ${jd?.role_title ?? input.role ?? 'n/a'}
JD company: ${jd?.company_name ?? input.company ?? 'n/a'}
JD requirements: ${(jd?.requirements ?? []).join(' | ')}
JD keywords: ${(jd?.keywords ?? []).join(', ')}
CV excerpt: ${(input.cvText ?? analysis.parsed_text).slice(0, 1500)}

Return ONLY JSON:
{"questions":[{"text":"...","category":"ux_process","is_personal":true}]}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return buildQuestionsFromCv(analysis, jd);
  }

  const data = (await response.json()) as {
    content: Array<{type: string; text?: string}>;
  };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '{}';
  try {
    const parsed = JSON.parse(text) as {questions: GeneratedQuestion[]};
    if (parsed.questions?.length) {
      return parsed.questions.map((q) => ({
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
    }
  } catch {
    // fall through
  }
  return buildQuestionsFromCv(analysis, jd);
}

export async function gradeAnswer(input: {
  questionText: string;
  transcription: string;
  criteria?: import('@/lib/criteria').AnswerCriteria | null;
}): Promise<GradeResult> {
  if (useStubs()) {
    return gradeTranscriptLocally(input);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const criteria = input.criteria;
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
          content: `You are a senior design interview evaluator for a PERSONALIZED practice tool.

Score the candidate against:
1) The interview question
2) Core rubric axes 0-10: designThinking, communication, depth, knowledge, roleFit
3) These personalized criteria:
Must cover: ${(criteria?.mustCover ?? []).join(' | ')}
Strong signals: ${(criteria?.strongSignals ?? []).join(' | ')}
Weak signals (penalize): ${(criteria?.weakSignals ?? []).join(' | ')}
JD keywords: ${(criteria?.roleKeywords ?? []).join(', ')}

Question: ${input.questionText}
Transcript: ${input.transcription}

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
    "roleKeywordsHit": []
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
  return {
    ...parsed,
    scoreBreakdown: {
      designThinking: parsed.scoreBreakdown?.designThinking ?? 5,
      communication: parsed.scoreBreakdown?.communication ?? 5,
      depth: parsed.scoreBreakdown?.depth ?? 5,
      knowledge: parsed.scoreBreakdown?.knowledge ?? 5,
      roleFit: parsed.scoreBreakdown?.roleFit ?? 5,
    },
    evaluatedAgainst: parsed.evaluatedAgainst ?? {
      question: input.questionText,
      answerExcerpt: input.transcription.slice(0, 280),
      criteria: [...RUBRIC_CRITERIA],
      mustCover: criteria?.mustCover ?? [],
      mustCoverHit: [],
      mustCoverMissed: criteria?.mustCover ?? [],
      strongSignalsHit: [],
      weakSignalsHit: [],
      roleKeywordsHit: [],
    },
    stub: false,
  };
}
