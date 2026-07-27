import {randomUUID} from 'crypto';
import {promises as fs} from 'fs';
import path from 'path';
import type {
  CV,
  GradeResult,
  GeneratedQuestion,
  InterviewQuestion,
  InterviewSession,
  JobDescription,
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

export async function saveCv(input: {
  file_name: string;
  file_url: string;
  parsed_text: string;
  skills_extracted: string[];
  experience_years: number;
}): Promise<CV> {
  const cvs = await readJson<CV[]>('cvs.json', []);
  const cv: CV = {
    id: randomUUID(),
    user_id: DEMO_USER_ID,
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

export async function getCv(id: string): Promise<CV | null> {
  const cvs = await readJson<CV[]>('cvs.json', []);
  return cvs.find((c) => c.id === id) ?? null;
}

export async function saveJobDescription(input: {
  source_type: JobDescription['source_type'];
  file_name: string | null;
  file_url: string | null;
  raw_text: string;
  role_title: string | null;
  company_name: string | null;
  requirements: string[];
  responsibilities: string[];
  keywords: string[];
}): Promise<JobDescription> {
  const rows = await readJson<JobDescription[]>('job_descriptions.json', []);
  const jd: JobDescription = {
    id: randomUUID(),
    user_id: DEMO_USER_ID,
    ...input,
    created_at: new Date().toISOString(),
  };
  rows.push(jd);
  await writeJson('job_descriptions.json', rows);
  return jd;
}

export async function getJobDescription(
  id: string,
): Promise<JobDescription | null> {
  const rows = await readJson<JobDescription[]>('job_descriptions.json', []);
  return rows.find((j) => j.id === id) ?? null;
}

export async function createSession(input: {
  cv_id: string;
  job_description_id?: string | null;
  interview_type: InterviewSession['interview_type'];
  questions: GeneratedQuestion[];
}): Promise<{session: InterviewSession; questions: InterviewQuestion[]}> {
  const sessions = await readJson<InterviewSession[]>('sessions.json', []);
  const allQuestions = await readJson<InterviewQuestion[]>(
    'questions.json',
    [],
  );

  const session: InterviewSession = {
    id: randomUUID(),
    user_id: DEMO_USER_ID,
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

export async function getSession(id: string): Promise<InterviewSession | null> {
  const sessions = await readJson<InterviewSession[]>('sessions.json', []);
  return sessions.find((s) => s.id === id) ?? null;
}

export async function getSessionQuestions(
  sessionId: string,
): Promise<InterviewQuestion[]> {
  const questions = await readJson<InterviewQuestion[]>('questions.json', []);
  return questions
    .filter((q) => q.session_id === sessionId)
    .sort((a, b) => a.question_order - b.question_order);
}

export async function saveAnswer(input: {
  question_id: string;
  audio_url: string | null;
  transcription: string;
  duration_seconds: number | null;
}): Promise<UserAnswer> {
  const answers = await readJson<UserAnswer[]>('answers.json', []);
  const answer: UserAnswer = {
    id: randomUUID(),
    question_id: input.question_id,
    user_id: DEMO_USER_ID,
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
  const answers = await readJson<UserAnswer[]>('answers.json', []);
  return answers.find((a) => a.id === id) ?? null;
}

export async function updateAnswerGrade(
  answerId: string,
  grade: GradeResult,
): Promise<UserAnswer | null> {
  const answers = await readJson<UserAnswer[]>('answers.json', []);
  const index = answers.findIndex((a) => a.id === answerId);
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
  const questions = await readJson<InterviewQuestion[]>('questions.json', []);
  return questions.find((q) => q.id === id) ?? null;
}
