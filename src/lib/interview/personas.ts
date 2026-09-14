import type {InterviewPersona} from '@/lib/types';

export const INTERVIEW_PERSONAS = [
  'hirer',
  'engineer',
  'pm',
  'senior_designer',
  'ceo',
  'cio',
] as const;

export type InterviewRound = 1 | 2 | 3;
export type ExecPersona = 'ceo' | 'cio';

export type PersonaVoice = {
  persona: InterviewPersona;
  name: string;
  title: string;
};

export const PERSONA_VOICES: Record<InterviewPersona, PersonaVoice> = {
  hirer: {persona: 'hirer', name: 'Tom', title: 'Hiring manager'},
  engineer: {persona: 'engineer', name: 'Priya', title: 'Engineering'},
  pm: {persona: 'pm', name: 'Marcus', title: 'Product'},
  senior_designer: {
    persona: 'senior_designer',
    name: 'Elena',
    title: 'Senior design',
  },
  ceo: {persona: 'ceo', name: 'Alex', title: 'CEO'},
  cio: {persona: 'cio', name: 'Jordan', title: 'CIO'},
};

export function isInterviewPersona(
  value: string | null | undefined,
): value is InterviewPersona {
  return INTERVIEW_PERSONAS.includes(value as InterviewPersona);
}

export function parseInterviewPersona(
  value: string | null | undefined,
): InterviewPersona | null {
  return isInterviewPersona(value) ? value : null;
}

export function parseInterviewRound(
  value: number | string | null | undefined,
): InterviewRound {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

export function durationLabelForRound(round: InterviewRound): string {
  if (round === 2) return 'about 25 minutes';
  if (round === 3) return 'about 20 minutes';
  return 'about an hour';
}

export function roundTitle(round: InterviewRound): string {
  if (round === 2) return 'Team round';
  if (round === 3) return 'Exec round';
  return 'Hiring screen';
}

export function voicesForRound(
  round: InterviewRound,
  exec: ExecPersona = 'ceo',
): PersonaVoice[] {
  if (round === 2) {
    return [
      PERSONA_VOICES.engineer,
      PERSONA_VOICES.pm,
      PERSONA_VOICES.senior_designer,
    ];
  }
  if (round === 3) return [PERSONA_VOICES[exec]];
  return [PERSONA_VOICES.hirer];
}

export function personaLine(persona: InterviewPersona | null | undefined): string {
  const voice = persona ? PERSONA_VOICES[persona] : PERSONA_VOICES.hirer;
  return `${voice.name}, ${voice.title.toLowerCase()}`;
}
