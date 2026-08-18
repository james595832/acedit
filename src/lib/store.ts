import {randomUUID} from 'crypto';
import {promises as fs} from 'fs';
import path from 'path';
import {createServiceClient} from '@/lib/supabase/admin';
import {isSupabaseConfigured} from '@/lib/supabase/config';
import type {
  CV,
  GradeResult,
  GeneratedQuestion,
  InterviewQuestion,
  InterviewSession,
  JobDescription,
  QuestionCategory,
  UserAnswer,
} from '@/lib/types';

const DATA_DIR = path.join(process.cwd(), '.data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, {recursive: true});
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  await ensureDir();
  const full = path.join(DATA_DIR, file);
  try {
    const raw = await fs.readFile(full, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  await ensureDir();
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export function demoUserId() {
  return DEMO_USER_ID;
}

/** Prefer Supabase when Auth + service role are configured (hosted / real accounts). */
function useRemoteStore(): boolean {
  return (
    isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_KEY?.trim())
  );
}

function owned<T extends {user_id: string}>(
  row: T | null,
  userId: string,
): T | null {
  if (!row || row.user_id !== userId) return null;
  return row;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function mapCv(row: Record<string, unknown>): CV {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    file_url: String(row.file_url),
    file_name: String(row.file_name),
    parsed_text: (row.parsed_text as string | null) ?? null,
    skills_extracted: asStringArray(row.skills_extracted),
    experience_years:
      typeof row.experience_years === 'number' ? row.experience_years : null,
    analyzed_at: (row.analyzed_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

function mapJd(row: Record<string, unknown>): JobDescription {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    source_type: row.source_type as JobDescription['source_type'],
    file_name: (row.file_name as string | null) ?? null,
    file_url: (row.file_url as string | null) ?? null,
    raw_text: String(row.raw_text ?? ''),
    role_title: (row.role_title as string | null) ?? null,
    company_name: (row.company_name as string | null) ?? null,
    requirements: asStringArray(row.requirements),
    responsibilities: asStringArray(row.responsibilities),
    keywords: asStringArray(row.keywords),
    created_at: String(row.created_at),
  };
}

function mapSession(row: Record<string, unknown>): InterviewSession {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    cv_id: (row.cv_id as string | null) ?? null,
    job_description_id: (row.job_description_id as string | null) ?? null,
    interview_type: row.interview_type as InterviewSession['interview_type'],
    stage_number: Number(row.stage_number ?? 1),
    status: row.status as InterviewSession['status'],
    started_at: String(row.started_at),
    completed_at: (row.completed_at as string | null) ?? null,
    overall_score:
      row.overall_score === null || row.overall_score === undefined
        ? null
        : Number(row.overall_score),
    feedback: (row.feedback as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

function mapQuestion(row: Record<string, unknown>): InterviewQuestion {
  return {
    id: String(row.id),
    session_id: String(row.session_id),
    question_text: String(row.question_text),
    question_order: Number(row.question_order ?? 0),
    question_category: row.question_category as QuestionCategory,
    is_personal: Boolean(row.is_personal),
    criteria_json: (row.criteria_json as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

function mapAnswer(row: Record<string, unknown>): UserAnswer {
  return {
    id: String(row.id),
    question_id: String(row.question_id),
    user_id: String(row.user_id),
    audio_url: (row.audio_url as string | null) ?? null,
    transcription: (row.transcription as string | null) ?? null,
    answer_text: (row.answer_text as string | null) ?? null,
    score:
      row.score === null || row.score === undefined ? null : Number(row.score),
    feedback: (row.feedback as string | null) ?? null,
    duration_seconds:
      row.duration_seconds === null || row.duration_seconds === undefined
        ? null
        : Number(row.duration_seconds),
    created_at: String(row.created_at),
  };
}

export async function saveCv(
  input: {
    file_name: string;
    file_url: string;
    parsed_text: string;
    skills_extracted: string[];
    experience_years: number;
  },
  userId: string,
): Promise<CV> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('cvs')
      .insert({
        user_id: userId,
        file_url: input.file_url,
        file_name: input.file_name,
        parsed_text: input.parsed_text,
        skills_extracted: input.skills_extracted,
        experience_years: input.experience_years,
        analyzed_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Could not save CV');
    }
    return mapCv(data as Record<string, unknown>);
  }

  const cvs = await readJson<CV[]>('cvs.json', []);
  const cv: CV = {
    id: randomUUID(),
    user_id: userId,
    file_url: input.file_url,
    file_name: input.file_name,
    parsed_text: input.parsed_text,
    skills_extracted: input.skills_extracted,
    experience_years: input.experience_years,
    analyzed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  cvs.push(cv);
  await writeJson('cvs.json', cvs);
  return cv;
}

export async function getCv(id: string, userId?: string): Promise<CV | null> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    let query = admin.from('cvs').select('*').eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const {data, error} = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapCv(data as Record<string, unknown>) : null;
  }

  const cvs = await readJson<CV[]>('cvs.json', []);
  const cv = cvs.find(c => c.id === id) ?? null;
  return userId ? owned(cv, userId) : cv;
}

export async function saveJobDescription(
  input: {
    source_type: JobDescription['source_type'];
    file_name: string | null;
    file_url: string | null;
    raw_text: string;
    role_title: string | null;
    company_name: string | null;
    requirements: string[];
    responsibilities: string[];
    keywords: string[];
  },
  userId: string,
): Promise<JobDescription> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('job_descriptions')
      .insert({
        user_id: userId,
        source_type: input.source_type,
        file_name: input.file_name,
        file_url: input.file_url,
        raw_text: input.raw_text,
        role_title: input.role_title,
        company_name: input.company_name,
        requirements: input.requirements,
        responsibilities: input.responsibilities,
        keywords: input.keywords,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(
        error?.message ??
          'Could not save job description (run latest Supabase migrations)',
      );
    }
    return mapJd(data as Record<string, unknown>);
  }

  const rows = await readJson<JobDescription[]>('job_descriptions.json', []);
  const jd: JobDescription = {
    id: randomUUID(),
    user_id: userId,
    ...input,
    created_at: new Date().toISOString(),
  };
  rows.push(jd);
  await writeJson('job_descriptions.json', rows);
  return jd;
}

export async function getJobDescription(
  id: string,
  userId?: string,
): Promise<JobDescription | null> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    let query = admin.from('job_descriptions').select('*').eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const {data, error} = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapJd(data as Record<string, unknown>) : null;
  }

  const rows = await readJson<JobDescription[]>('job_descriptions.json', []);
  const jd = rows.find(j => j.id === id) ?? null;
  return userId ? owned(jd, userId) : jd;
}

export async function createSession(
  input: {
    cv_id: string;
    job_description_id?: string | null;
    interview_type: InterviewSession['interview_type'];
    questions: GeneratedQuestion[];
  },
  userId: string,
): Promise<{session: InterviewSession; questions: InterviewQuestion[]}> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    const baseSession = {
      user_id: userId,
      cv_id: input.cv_id,
      interview_type: input.interview_type,
      stage_number: 1,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    };

    let sessionRow: Record<string, unknown> | null = null;
    let sessionError: {message: string} | null = null;

    {
      const first = await admin
        .from('interview_sessions')
        .insert({
          ...baseSession,
          job_description_id: input.job_description_id ?? null,
        })
        .select('*')
        .single();
      if (first.error?.message?.includes('job_description_id')) {
        const retry = await admin
          .from('interview_sessions')
          .insert(baseSession)
          .select('*')
          .single();
        sessionRow = (retry.data as Record<string, unknown> | null) ?? null;
        sessionError = retry.error;
      } else {
        sessionRow = (first.data as Record<string, unknown> | null) ?? null;
        sessionError = first.error;
      }
    }

    if (sessionError || !sessionRow) {
      throw new Error(
        sessionError?.message ?? 'Could not create interview session',
      );
    }

    const session = mapSession(sessionRow);
    const withCriteria = input.questions.map((q, index) => ({
      session_id: session.id,
      question_text: q.text,
      question_order: index + 1,
      question_category: q.category,
      is_personal: q.is_personal,
      criteria_json: q.criteria ? JSON.stringify(q.criteria) : null,
    }));

    let storedQuestions: Record<string, unknown>[] | null = null;
    let questionError: {message: string} | null = null;

    {
      const first = await admin
        .from('interview_questions')
        .insert(withCriteria)
        .select('*');
      if (first.error?.message?.includes('criteria_json')) {
        const withoutCriteria = withCriteria.map(
          ({criteria_json: _ignored, ...rest}) => rest,
        );
        const retry = await admin
          .from('interview_questions')
          .insert(withoutCriteria)
          .select('*');
        storedQuestions =
          (retry.data as Record<string, unknown>[] | null) ?? null;
        questionError = retry.error;
      } else {
        storedQuestions =
          (first.data as Record<string, unknown>[] | null) ?? null;
        questionError = first.error;
      }
    }

    if (questionError || !storedQuestions) {
      throw new Error(questionError?.message ?? 'Could not save questions');
    }

    return {
      session,
      questions: storedQuestions.map(mapQuestion),
    };
  }

  const sessions = await readJson<InterviewSession[]>('sessions.json', []);
  const allQuestions = await readJson<InterviewQuestion[]>(
    'questions.json',
    [],
  );

  const session: InterviewSession = {
    id: randomUUID(),
    user_id: userId,
    cv_id: input.cv_id,
    job_description_id: input.job_description_id ?? null,
    interview_type: input.interview_type,
    stage_number: 1,
    status: 'in_progress',
    started_at: new Date().toISOString(),
    completed_at: null,
    overall_score: null,
    feedback: null,
    created_at: new Date().toISOString(),
  };

  const questions: InterviewQuestion[] = input.questions.map((q, index) => ({
    id: randomUUID(),
    session_id: session.id,
    question_text: q.text,
    question_order: index + 1,
    question_category: q.category,
    is_personal: q.is_personal,
    criteria_json: q.criteria ? JSON.stringify(q.criteria) : null,
    created_at: new Date().toISOString(),
  }));

  sessions.push(session);
  await writeJson('sessions.json', sessions);
  await writeJson('questions.json', [...allQuestions, ...questions]);

  return {session, questions};
}

export async function getSession(
  id: string,
  userId?: string,
): Promise<InterviewSession | null> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    let query = admin.from('interview_sessions').select('*').eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const {data, error} = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSession(data as Record<string, unknown>) : null;
  }

  const sessions = await readJson<InterviewSession[]>('sessions.json', []);
  const session = sessions.find(s => s.id === id) ?? null;
  return userId ? owned(session, userId) : session;
}

export async function listSessions(userId: string): Promise<InterviewSession[]> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('interview_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', {ascending: false});
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map(mapSession);
  }

  const sessions = await readJson<InterviewSession[]>('sessions.json', []);
  return sessions.filter(s => s.user_id === userId);
}

export async function getSessionQuestions(
  sessionId: string,
): Promise<InterviewQuestion[]> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('interview_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('question_order', {ascending: true});
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map(mapQuestion);
  }

  const questions = await readJson<InterviewQuestion[]>('questions.json', []);
  return questions
    .filter(q => q.session_id === sessionId)
    .sort((a, b) => a.question_order - b.question_order);
}

export async function getQuestionForUserSession(
  questionId: string,
  userId: string,
): Promise<{question: InterviewQuestion; session: InterviewSession} | null> {
  const question = await getQuestion(questionId);
  if (!question) return null;
  const session = await getSession(question.session_id, userId);
  if (!session) return null;
  return {question, session};
}

export async function saveAnswer(
  input: {
    question_id: string;
    audio_url: string | null;
    transcription: string;
    duration_seconds: number | null;
  },
  userId: string,
): Promise<UserAnswer> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('user_answers')
      .insert({
        question_id: input.question_id,
        user_id: userId,
        audio_url: input.audio_url,
        transcription: input.transcription,
        answer_text: input.transcription,
        duration_seconds: input.duration_seconds,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Could not save answer');
    }
    return mapAnswer(data as Record<string, unknown>);
  }

  if (process.env.VERCEL) {
    throw new Error(
      'Answer save needs SUPABASE_SERVICE_KEY on hosted deploys (local .data/ is read-only).',
    );
  }

  const answers = await readJson<UserAnswer[]>('answers.json', []);
  const answer: UserAnswer = {
    id: randomUUID(),
    question_id: input.question_id,
    user_id: userId,
    audio_url: input.audio_url,
    transcription: input.transcription,
    answer_text: input.transcription,
    score: null,
    feedback: null,
    duration_seconds: input.duration_seconds,
    created_at: new Date().toISOString(),
  };
  answers.push(answer);
  await writeJson('answers.json', answers);
  return answer;
}

export async function getAnswer(id: string): Promise<UserAnswer | null> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('user_answers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapAnswer(data as Record<string, unknown>) : null;
  }

  const answers = await readJson<UserAnswer[]>('answers.json', []);
  return answers.find(a => a.id === id) ?? null;
}

export async function getAnswerForUser(
  answerId: string,
  userId: string,
): Promise<UserAnswer | null> {
  const answer = await getAnswer(answerId);
  return owned(answer, userId);
}

/** Latest answer per question for a user (by created_at). */
export async function listAnswersForQuestions(
  questionIds: string[],
  userId: string,
): Promise<UserAnswer[]> {
  if (questionIds.length === 0) return [];

  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('user_answers')
      .select('*')
      .eq('user_id', userId)
      .in('question_id', questionIds)
      .order('created_at', {ascending: false});
    if (error) throw new Error(error.message);

    const latestByQuestion = new Map<string, UserAnswer>();
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const answer = mapAnswer(row);
      if (!latestByQuestion.has(answer.question_id)) {
        latestByQuestion.set(answer.question_id, answer);
      }
    }
    return questionIds
      .map((id) => latestByQuestion.get(id))
      .filter((a): a is UserAnswer => Boolean(a));
  }

  const answers = await readJson<UserAnswer[]>('answers.json', []);
  const latestByQuestion = new Map<string, UserAnswer>();
  for (const answer of answers) {
    if (answer.user_id !== userId) continue;
    if (!questionIds.includes(answer.question_id)) continue;
    const existing = latestByQuestion.get(answer.question_id);
    if (
      !existing ||
      new Date(answer.created_at).getTime() >
        new Date(existing.created_at).getTime()
    ) {
      latestByQuestion.set(answer.question_id, answer);
    }
  }
  return questionIds
    .map((id) => latestByQuestion.get(id))
    .filter((a): a is UserAnswer => Boolean(a));
}

export async function updateAnswerGrade(
  answerId: string,
  grade: GradeResult,
): Promise<UserAnswer | null> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('user_answers')
      .update({
        score: grade.score,
        feedback: JSON.stringify(grade),
      })
      .eq('id', answerId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapAnswer(data as Record<string, unknown>) : null;
  }

  const answers = await readJson<UserAnswer[]>('answers.json', []);
  const index = answers.findIndex(a => a.id === answerId);
  if (index < 0) return null;
  answers[index] = {
    ...answers[index],
    score: grade.score,
    feedback: JSON.stringify(grade),
  };
  await writeJson('answers.json', answers);
  return answers[index];
}

export async function getQuestion(
  id: string,
): Promise<InterviewQuestion | null> {
  if (useRemoteStore()) {
    const admin = createServiceClient();
    const {data, error} = await admin
      .from('interview_questions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapQuestion(data as Record<string, unknown>) : null;
  }

  const questions = await readJson<InterviewQuestion[]>('questions.json', []);
  return questions.find(q => q.id === id) ?? null;
}
