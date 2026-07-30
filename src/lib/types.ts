/** Shared domain types for ACED-IT (mirrors Supabase schema). */

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
};

export type InterviewType = 'practice' | 'faang_stage_1';

export type InterviewStatus = 'in_progress' | 'completed' | 'paused';

export type QuestionCategory =
  | 'ux_process'
  | 'visual_design'
  | 'interaction'
  | 'whiteboard'
  | 'communication'
  | 'design_thinking';

export type CV = {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  parsed_text: string | null;
  skills_extracted: string[];
  experience_years: number | null;
  analyzed_at: string | null;
  created_at: string;
};

export type CandidateResearch = {
  id: string;
  user_id: string;
  company_name: string | null;
  role_title: string | null;
  research_notes: string | null;
  portfolio_links: string[];
  company_values: string | null;
  team_info: string | null;
  created_at: string;
};

export type InterviewSession = {
  id: string;
  user_id: string;
  cv_id: string | null;
  job_description_id: string | null;
  interview_type: InterviewType;
  stage_number: number;
  status: InterviewStatus;
  started_at: string;
  completed_at: string | null;
  overall_score: number | null;
  feedback: string | null;
  created_at: string;
};

export type InterviewQuestion = {
  id: string;
  session_id: string;
  question_text: string;
  question_order: number;
  question_category: QuestionCategory;
  is_personal: boolean;
  criteria_json: string | null;
  created_at: string;
};

export type UserAnswer = {
  id: string;
  question_id: string;
  user_id: string;
  audio_url: string | null;
  transcription: string | null;
  answer_text: string | null;
  score: number | null;
  feedback: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export type QuestionBankItem = {
  id: string;
  question_text: string;
  category: QuestionCategory;
  difficulty: number;
  is_active: boolean;
  created_at: string;
};

export type GeneratedQuestion = {
  text: string;
  category: QuestionCategory;
  is_personal: boolean;
  criteria?: {
    mustCover: string[];
    strongSignals: string[];
    weakSignals: string[];
    roleKeywords: string[];
    summary: string;
  };
};

export type JobDescription = {
  id: string;
  user_id: string;
  source_type: 'image' | 'pdf' | 'text';
  file_name: string | null;
  file_url: string | null;
  raw_text: string;
  role_title: string | null;
  company_name: string | null;
  requirements: string[];
  responsibilities: string[];
  keywords: string[];
  created_at: string;
};

export type GradeResult = {
  score: number;
  scoreBreakdown: {
    designThinking: number;
    communication: number;
    depth: number;
    knowledge: number;
    roleFit: number;
  };
  feedback: string;
  strengths: string[];
  improvements: string[];
  /** What the scorer compared the answer against */
  evaluatedAgainst: {
    question: string;
    answerExcerpt: string;
    criteria: string[];
    mustCover: string[];
    mustCoverHit: string[];
    mustCoverMissed: string[];
    strongSignalsHit: string[];
    weakSignalsHit: string[];
    roleKeywordsHit: string[];
  };
  stub?: boolean;
};

export type ApiError = {
  error: string;
  code: string;
};
