export const INTERVIEW_TRACK_IDS = [
  'art_director',
  'ux_researcher',
  'ux_designer',
  'product_designer',
  'creative_director',
  'intern_graphic_designer',
] as const;

export type InterviewTrackId = (typeof INTERVIEW_TRACK_IDS)[number];

export type InterviewTrackFamily =
  | 'visual'
  | 'research'
  | 'ux'
  | 'product'
  | 'direction'
  | 'intern_visual';

export type InterviewTrack = {
  id: InterviewTrackId;
  label: string;
  article: 'a' | 'an';
  family: InterviewTrackFamily;
  /** Short craft noun for “path as a …” */
  craftNoun: string;
  syntheticJd: string;
};

export const INTERVIEW_TRACKS: InterviewTrack[] = [
  {
    id: 'art_director',
    label: 'Art director',
    article: 'an',
    family: 'visual',
    craftNoun: 'art director',
    syntheticJd: `Job title: Art director

Requirements:
- Set visual direction for campaigns, brand systems, and art direction across channels
- Strong typography, layout, photography, and craft judgement
- Brief designers and partners without doing every pixel yourself
- Protect the brand when stakeholders push off-strategy work
- Comfortable with AI image tools as a sketch, not a substitute for art direction

The role:
- Own the look and feel of work from brief to finish
- Give clear visual feedback and raise the quality bar
- Present creative to clients or internal brand leads`,
  },
  {
    id: 'ux_researcher',
    label: 'UX researcher',
    article: 'a',
    family: 'research',
    craftNoun: 'researcher',
    syntheticJd: `Job title: UX researcher

Requirements:
- Plan and run qualitative interviews, usability tests, and diary studies
- Recruit participants and synthesise findings into insights the team can act on
- Choose methods that match the question, not a favourite toolkit
- Partner with product and design without becoming the delivery owner
- Research ethics, consent, and how you socialise insights
- AI for transcripts or clustering is fine; judgement of evidence stays human

The role:
- Own research for a product area
- Present findings and recommendations stakeholders will actually use`,
  },
  {
    id: 'ux_designer',
    label: 'UX designer',
    article: 'a',
    family: 'ux',
    craftNoun: 'UX designer',
    syntheticJd: `Job title: UX designer

Requirements:
- End-to-end UX: problem framing, flows, information architecture, and usability
- Prototype and test with users; iterate from evidence
- Accessibility and clear interaction design
- Work with researchers, PMs, and engineers without handing off a pretty mock only
- Figma (or equivalent) as a thinking tool, not just a file dump

The role:
- Design usable journeys for a product area
- Argue for users when the timeline wants a shortcut`,
  },
  {
    id: 'product_designer',
    label: 'Product designer',
    article: 'a',
    family: 'product',
    craftNoun: 'designer',
    syntheticJd: `Job title: Product designer

Requirements:
- Product design craft: problem framing, prototyping, and shipping with engineers
- Research and usability; you can run or partner on it
- Stakeholder collaboration with PMs and engineers
- Accessibility, design systems, and measurable outcomes
- AI in the design workflow with judgement of what is good enough to ship

The role:
- Own product design for a feature or area
- Define the problem, explore options, and decide what to ship`,
  },
  {
    id: 'creative_director',
    label: 'Creative director',
    article: 'a',
    family: 'direction',
    craftNoun: 'creative director',
    syntheticJd: `Job title: Creative director

Requirements:
- Set creative vision and a quality bar across campaigns and brand
- Lead designers and art directors: briefs, critique, and hiring taste
- Protect craft when a CMO or founder wants something off-strategy
- Present ideas that win rooms without drowning in slides
- Policy for generative AI in the studio — what you allow, what you refuse

The role:
- Own the creative direction of the work
- Make the team better, not only your own boards`,
  },
  {
    id: 'intern_graphic_designer',
    label: 'Intern graphic designer',
    article: 'an',
    family: 'intern_visual',
    craftNoun: 'graphic designer',
    syntheticJd: `Job title: Intern graphic designer

Requirements:
- Layout, typography, and visual craft in Adobe or Figma
- Take a brief and turn it into finished assets with guidance
- Receive critique without defending every pixel
- File hygiene, versions, and handing work to a senior designer
- Internship-level ownership: ask questions, show drafts early, learn the tools
- AI for roughs is allowed; copying a generated layout as “done” is not

The role:
- Support campaigns, social, and brand work as a junior pair of hands
- Learn professional graphic design practice, not product strategy`,
  },
];

const TRACK_BY_ID = new Map(INTERVIEW_TRACKS.map((track) => [track.id, track]));

export function isInterviewTrackId(value: string): value is InterviewTrackId {
  return TRACK_BY_ID.has(value as InterviewTrackId);
}

export function getTrack(id: string | null | undefined): InterviewTrack | null {
  if (!id) return null;
  return TRACK_BY_ID.get(id as InterviewTrackId) ?? null;
}

export function inferTrackFromRole(
  roleTitle: string | null | undefined,
): InterviewTrack | null {
  if (!roleTitle?.trim()) return null;
  const text = roleTitle.toLowerCase();

  if (
    /intern/.test(text) &&
    /graphic|visual|layout|studio/.test(text)
  ) {
    return getTrack('intern_graphic_designer');
  }
  if (/intern graphic|graphic design intern|junior graphic/.test(text)) {
    return getTrack('intern_graphic_designer');
  }
  if (/graphic designer/.test(text) && /intern|junior|placement/.test(text)) {
    return getTrack('intern_graphic_designer');
  }
  if (/graphic designer/.test(text)) {
    return getTrack('intern_graphic_designer');
  }
  if (/art director/.test(text)) return getTrack('art_director');
  if (/creative director/.test(text)) return getTrack('creative_director');
  if (/research/.test(text)) return getTrack('ux_researcher');
  if (/\bux designer\b|ui\/ux|user experience designer/.test(text)) {
    return getTrack('ux_designer');
  }
  if (/product design/.test(text)) return getTrack('product_designer');
  if (/\bux\b/.test(text) && /design/.test(text)) return getTrack('ux_designer');

  return null;
}

export function resolveInterviewTrack(input: {
  trackId?: string | null;
  roleTitle?: string | null;
}): InterviewTrack | null {
  return getTrack(input.trackId) ?? inferTrackFromRole(input.roleTitle);
}

export function trackPositionLine(track: InterviewTrack): string {
  return `${track.article} ${track.label} role`;
}

export type TrackQuestionContext = {
  skill: string;
  project: string;
  company: string;
  role: string;
  years: string;
  jdFocus: string;
  hasCompany: boolean;
  hasJd: boolean;
  jdWantsAi: boolean;
  cvUsesAi: boolean;
};

export type TrackDraftQuestion = {
  text: string;
  category:
    | 'ux_process'
    | 'visual_design'
    | 'interaction'
    | 'whiteboard'
    | 'communication'
    | 'design_thinking';
  is_personal: boolean;
  kind:
    | 'intro'
    | 'motivation'
    | 'self_awareness'
    | 'conflict'
    | 'ambition'
    | 'cv_project'
    | 'ai'
    | 'jd_fit'
    | 'stakeholder'
    | 'horizon';
};

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function motivationText(track: InterviewTrack, ctx: TrackQuestionContext): string {
  if (ctx.hasJd && ctx.hasCompany) {
    return `Why do you want to work at ${ctx.company} as ${ctx.role}? What did you learn about the product, the users, or how they work?`;
  }
  if (track.family === 'intern_visual') {
    return `Why this intern graphic designer role next? What do you want to learn, given your work at ${ctx.company}?`;
  }
  if (track.family === 'research') {
    return `Why this kind of UX research role next? What would make a team a good fit given your work at ${ctx.company}?`;
  }
  if (track.family === 'visual') {
    return `Why this kind of art director role next? What would make a studio or brand a good fit given your work at ${ctx.company}?`;
  }
  if (track.family === 'direction') {
    return `Why this kind of creative director role next? What would make a team a good fit given your work at ${ctx.company}?`;
  }
  if (track.family === 'ux') {
    return `Why this kind of UX designer role next? What would make a team a good fit given your work at ${ctx.company}?`;
  }
  return `Why this kind of product-design role next? What would make a team a good fit given your work at ${ctx.company}?`;
}

function ambitionText(track: InterviewTrack, ctx: TrackQuestionContext): string {
  if (ctx.hasJd && ctx.hasCompany) {
    return `Where do you see yourself in five years, and how does ${ctx.role} at ${ctx.company} fit that path?`;
  }
  if (track.family === 'intern_visual') {
    return `Where do you see yourself in five years? How does an internship or junior graphic role, at your level (${ctx.years} on the CV), fit that path?`;
  }
  return `Where do you see yourself in five years? How does a role like this, at your level (${ctx.years} on the CV), fit that path?`;
}

function projectWalkthrough(track: InterviewTrack, ctx: TrackQuestionContext): string {
  const piece = truncate(ctx.project, 60);
  switch (track.family) {
    case 'research':
      return `Walk me through the research on “${piece}”. What was the question, which method did you pick, and what changed because of what you found?`;
    case 'visual':
      return `Walk me through the art direction on “${piece}”. What was the brief, what references did you set, and how did the finish match that direction?`;
    case 'direction':
      return `Walk me through leading “${piece}”. What was the creative idea, how did you brief the team, and where did you hold the quality bar?`;
    case 'intern_visual':
      return `Walk me through “${piece}”. What was the brief, what did you make, which tools did you use, and what did a more senior person change?`;
    case 'ux':
      return `Walk me through “${piece}” as a UX problem. How did you map the journey, where did users struggle, and what did you change?`;
    default:
      return `Walk me through “${piece}” end-to-end. How did you define the problem, explore options, and decide what to ship?`;
  }
}

function aiQuestion(track: InterviewTrack, ctx: TrackQuestionContext): string {
  if (ctx.jdWantsAi) {
    if (track.family === 'intern_visual') {
      return `This intern role expects you to use AI carefully (“${truncate(ctx.jdFocus, 50)}”). Using a CV example, how have you used it — and how did you check the work with a senior before calling it done?`;
    }
    if (track.family === 'research') {
      return `This research role expects AI in the workflow (“${truncate(ctx.jdFocus, 50)}”). Using a CV example, how have you used it on notes or analysis — and how did you keep the evidence honest?`;
    }
    return `This role at ${ctx.company} expects AI in the work (“${truncate(ctx.jdFocus, 50)}”). Using a CV example, how have you used AI in design — and how did you check the output was good enough to ship?`;
  }
  if (ctx.cvUsesAi) {
    return `Your CV shows AI in the work at ${ctx.company}. Walk me through a real example: what did you use AI for, what did you still do yourself, and how did you judge the output?`;
  }
  const piece = truncate(ctx.project, 50);
  switch (track.family) {
    case 'research':
      return `Research teams now use AI on transcripts and notes. On “${piece}”, where would you bring it in, where would you refuse it, and how would you keep the evidence honest?`;
    case 'visual':
    case 'direction':
      return `Generative image tools are in most studios now. On “${piece}”, where would you use them, where would you refuse them for the brand, and who still signs off the craft?`;
    case 'intern_visual':
      return `On “${piece}”, where would you use AI as an intern, where would you refuse it, and how would you check the work with a senior designer before calling it done?`;
    default:
      return `Most product teams now expect designers to use AI. On “${piece}”, where would you bring it in, where would you refuse it, and how would you keep user evidence in the loop?`;
  }
}

function craftDecision(track: InterviewTrack, ctx: TrackQuestionContext): string {
  if (ctx.hasJd) {
    const who = ctx.hasCompany ? `This role at ${ctx.company}` : `This ${ctx.role} role`;
    return `${who} asks for ${truncate(ctx.jdFocus, 70)}. Using a CV example, how have you demonstrated that?`;
  }
  switch (track.family) {
    case 'research':
      return `Your CV highlights ${ctx.skill}. Tell me about a study where the method really mattered. Why that method, and what would a weaker method have missed?`;
    case 'visual':
      return `Your CV highlights ${ctx.skill}. Tell me about a visual decision — type, layout, or photography — that changed the work. What did you reject?`;
    case 'direction':
      return `Your CV highlights ${ctx.skill}. Tell me about a time you redirected the work. What was off, what did you ask for, and how did the team respond?`;
    case 'intern_visual':
      return `Your CV highlights ${ctx.skill}. Tell me about a piece where feedback changed the outcome. What did you try first, and what did you change?`;
    default:
      return `Your CV highlights ${ctx.skill}. Tell me about a decision where ${ctx.skill} really changed the outcome. What alternatives did you reject?`;
  }
}

function stakeholderText(track: InterviewTrack, ctx: TrackQuestionContext): string {
  switch (track.family) {
    case 'research':
      return ctx.hasCompany
        ? `For ${ctx.role} at ${ctx.company}, how would you handle a product team wanting to ship before the research is in — or ignoring what you found?`
        : `At ${ctx.company} as ${ctx.role}, how did you handle a team that wanted to skip research or ignore the findings?`;
    case 'visual':
      return ctx.hasCompany
        ? `For ${ctx.role} at ${ctx.company}, how would you handle a client or brand lead pushing a look that fights the art direction?`
        : `At ${ctx.company} as ${ctx.role}, how did you handle a client or stakeholder who wanted visuals that fought the direction?`;
    case 'direction':
      return ctx.hasCompany
        ? `For ${ctx.role} at ${ctx.company}, how would you handle a founder or CMO pushing work that undercuts the creative idea?`
        : `At ${ctx.company} as ${ctx.role}, how did you handle a senior stakeholder pushing work that undercut the idea?`;
    case 'intern_visual':
      return ctx.hasCompany
        ? `For this internship at ${ctx.company}, how would you handle a senior designer rewriting your layout the night before a deadline?`
        : `At ${ctx.company}, how did you handle a more senior designer changing your work — what did you take on, and what did you ask about?`;
    default:
      return ctx.hasCompany
        ? `For ${ctx.role} at ${ctx.company}, how would you handle a PM pushing to ship an AI feature before you’ve seen user evidence?`
        : `At ${ctx.company} as ${ctx.role}, how did you handle a conflict between stakeholder requests and user evidence?`;
  }
}

function horizonText(track: InterviewTrack, ctx: TrackQuestionContext): string {
  if (track.family === 'intern_visual') {
    return `If you landed this intern graphic designer role, what would you want to learn in the first few months — and how would you get feedback without waiting to be told?`;
  }
  if (ctx.hasJd) {
    switch (track.family) {
      case 'research':
        return `For ${ctx.role}, describe how you would approach the first 90 days. What would you learn about users and the team, and what would you actually run?`;
      case 'visual':
      case 'direction':
        return `For ${ctx.role}, describe how you would approach the first 90 days. What would you learn about the brand, and what would you make or redirect first?`;
      default:
        return `For ${ctx.role}, describe how you would approach the first 90 days. What would you learn, make, and measure?`;
    }
  }
  switch (track.family) {
    case 'research':
      return `With roughly ${ctx.years} on your CV, how has the way you socialise research changed — especially now that teams want answers faster, sometimes from AI?`;
    case 'visual':
    case 'direction':
      return `With roughly ${ctx.years} on your CV, how has your way of briefing and giving visual feedback evolved — especially now that AI image tools are in the mix?`;
    default:
      return `With roughly ${ctx.years} on your CV, how has your collaboration model with engineers and PMs evolved — especially now that AI is in the toolchain?`;
  }
}

function projectCategory(
  track: InterviewTrack,
): TrackDraftQuestion['category'] {
  if (track.family === 'visual' || track.family === 'intern_visual') {
    return 'visual_design';
  }
  if (track.family === 'research') return 'ux_process';
  return 'ux_process';
}

/** Ten spoken questions tailored to the target craft. Product designer + no JD keeps the original copy. */
export function draftQuestionsForTrack(
  track: InterviewTrack,
  ctx: TrackQuestionContext,
): TrackDraftQuestion[] {
  return [
    {
      kind: 'intro',
      text: `Tell me about yourself. Walk me through your path as a ${track.craftNoun}, including your recent work at ${ctx.company}.`,
      category: 'communication',
      is_personal: true,
    },
    {
      kind: 'motivation',
      text: motivationText(track, ctx),
      category: 'communication',
      is_personal: true,
    },
    {
      kind: 'self_awareness',
      text: `What are your greatest strengths as a ${track.craftNoun}, and what’s a genuine weakness — with examples from ${ctx.company} or “${truncate(ctx.project, 40)}”?`,
      category: 'communication',
      is_personal: true,
    },
    {
      kind: 'conflict',
      text: `Tell me about a time you dealt with a conflict at work. What was at stake, what did you do, and how did it land?`,
      category: 'communication',
      is_personal: true,
    },
    {
      kind: 'ambition',
      text: ambitionText(track, ctx),
      category: 'communication',
      is_personal: ctx.hasJd,
    },
    {
      kind: 'cv_project',
      text: projectWalkthrough(track, ctx),
      category: projectCategory(track),
      is_personal: true,
    },
    {
      kind: 'ai',
      text: aiQuestion(track, ctx),
      category: 'design_thinking',
      is_personal: true,
    },
    {
      kind: ctx.hasJd ? 'jd_fit' : 'cv_project',
      text: craftDecision(track, ctx),
      category: ctx.hasJd ? 'communication' : 'design_thinking',
      is_personal: true,
    },
    {
      kind: 'stakeholder',
      text: stakeholderText(track, ctx),
      category: 'communication',
      is_personal: true,
    },
    {
      kind: 'horizon',
      text: horizonText(track, ctx),
      category: 'communication',
      is_personal: ctx.hasJd,
    },
  ];
}

export function llmTrackGuidance(track: InterviewTrack | null): string {
  if (!track) {
    return 'If no job description, write product-design questions unless a target role is named.';
  }
  switch (track.family) {
    case 'research':
      return 'Target craft: UX research. Ask about methods, sampling, synthesis, and teams ignoring evidence. Do not ask PM / shipping-product questions.';
    case 'visual':
      return 'Target craft: art direction. Ask about visual direction, briefs, brand, and craft. Do not ask IC product-design / PM questions.';
    case 'direction':
      return 'Target craft: creative direction. Ask about vision, leading creatives, and quality bars. Do not ask IC product-design delivery questions.';
    case 'intern_visual':
      return 'Target craft: intern graphic designer. Ask about briefs, tools, taking feedback, and learning. Do not ask 90-day product strategy or PM questions.';
    case 'ux':
      return 'Target craft: UX designer. Ask about journeys, IA, usability, and evidence. Less product-strategy / roadmap than a product designer screen.';
    default:
      return 'Target craft: product designer. Mix product thinking with craft.';
  }
}
