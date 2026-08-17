export type WhiteboardDifficulty = 'junior' | 'mid' | 'senior';

export type WhiteboardChallenge = {
  id: string;
  title: string;
  summary: string;
  /** Scene-setting context the candidate sees before the clock. */
  situation: string;
  /** One-line goal the candidate must address. */
  goal: string;
  /** Current product path / system they should start from. */
  asIs: string;
  /** Explicit deliverables we assess against. */
  deliverables: string[];
  durationMinutes: number;
  difficulty: WhiteboardDifficulty;
  focus: string[];
  maxClarifyingQuestions: number;
  /** Facts the interviewer may reveal if asked well. */
  knownFacts: string[];
  /** Guardrails — do not volunteer unless asked. */
  hiddenContext: string[];
  successCriteria: string[];
};

/** Full brief text for the AI interviewer / debrief (not shown as one blob in UI). */
export function formatChallengeBrief(challenge: WhiteboardChallenge): string {
  const deliver = challenge.deliverables
    .map((item, i) => `${i + 1}) ${item}`)
    .join('\n');
  return `${challenge.situation}

Goal: ${challenge.goal}

Current state (as-is): ${challenge.asIs}

Deliver:
${deliver}`;
}

export const WHITEBOARD_CHALLENGES: WhiteboardChallenge[] = [
  {
    id: 'checkout-abandonment',
    title: 'Reduce checkout abandonment',
    summary:
      'Diagnose why shoppers drop at payment and sketch a clearer checkout flow.',
    situation:
      'A mid-market ecommerce brand loses ~68% of carts between cart and payment confirmation. You’re the product designer in a 1:1 whiteboard.',
    goal:
      'Propose a revised mobile-web checkout that reduces drop-off without harming conversion trust.',
    asIs:
      'cart → shipping → payment → order confirmation. Guest checkout exists but is hard to find. Fees often appear only on the payment step.',
    deliverables: [
      'Clarify the problem and who is affected',
      'Map current checkout → your proposed flow',
      'Sketch key screens / states (boxes + labels ok)',
      'Call out risks, success metrics, and a lean validation plan',
    ],
    durationMinutes: 25,
    difficulty: 'mid',
    focus: ['conversion', 'mobile', 'flows'],
    maxClarifyingQuestions: 5,
    knownFacts: [
      'Current flow is cart → shipping → payment → confirmation.',
      'Top drop step is payment method entry (not shipping).',
      'Guest checkout exists but feels buried.',
      'Mobile is 72% of traffic; most abandoners are returning shoppers on phones.',
      'Support tickets mention unexpected fees late in flow.',
    ],
    hiddenContext: [
      'Average order value is £64.',
      'Apple Pay / Google Pay are not offered yet.',
      'Marketing wants a post-purchase upsell modal. Product is skeptical.',
    ],
    successCriteria: [
      'Asks useful clarifying questions before designing',
      'Names a primary user and jobs-to-be-done',
      'Simplifies steps and surfaces fees earlier',
      'Considers trust, errors, and empty/loading states',
      'Ties success to a measurable metric',
    ],
  },
  {
    id: 'onboarding-activation',
    title: 'Activate new B2B users',
    summary:
      'Design an onboarding path that gets teams to first value in under 10 minutes.',
    situation:
      'You’re designing onboarding for a B2B analytics SaaS. Signups are up, but only 22% of new workspaces complete a meaningful action in week one.',
    goal:
      'Whiteboard an activation journey from invite → first insight shared with a teammate.',
    asIs:
      'create workspace → connect 2–3 integrations → empty dashboard → optional invite. Most people stall before any insight is shared.',
    deliverables: [
      'Define what “activated” means as a concrete behavior',
      'Sequence invite → first-run → first shared insight',
      'Sketch empty states + guidance',
      'Decide what to defer vs force in setup',
      'Note analytics events you’d instrument',
    ],
    durationMinutes: 30,
    difficulty: 'mid',
    focus: ['activation', 'saas', 'onboarding'],
    maxClarifyingQuestions: 5,
    knownFacts: [
      'Current first-run is workspace → integrations → empty dashboard → optional invite.',
      'Most signups are invited by a teammate, not organic solo.',
      'First value is usually “shared a dashboard with a comment”.',
      'Admins complain setup asks for too many integrations upfront.',
      'Only 22% of new workspaces complete a meaningful action in week one.',
    ],
    hiddenContext: [
      'Sales demos skip self-serve onboarding entirely.',
      'Mobile app exists but is read-only.',
      'Legal requires a workspace name before any data import.',
    ],
    successCriteria: [
      'Defines activation as a concrete behavior',
      'Prioritizes time-to-value over feature tour',
      'Handles invitee vs admin paths',
      'Keeps setup optional where possible',
      'Names events that prove activation',
    ],
  },
  {
    id: 'accessibility-redesign',
    title: 'Make a booking flow accessible',
    summary:
      'Rehab a clinic appointment booking UI that fails basic accessibility audits.',
    situation:
      'A clinic’s online booking tool fails WCAG on contrast, focus order, and form errors. Leadership wants it usable with keyboard + screen readers — without looking “clinical grey”.',
    goal:
      'Redesign choose service → pick slot → confirm with accessibility as a first-class constraint.',
    asIs:
      'choose service → pick date → pick slot → patient details → confirm. Errors show as red borders only. Focus order skips the calendar. Slots can vanish while selecting.',
    deliverables: [
      'Audit the riskiest accessibility failure points in the current path',
      'Propose interaction patterns (focus, errors, confirmation)',
      'Sketch the critical screens',
      'Explain how you’d test with real assistive tech',
    ],
    durationMinutes: 20,
    difficulty: 'junior',
    focus: ['accessibility', 'forms', 'healthcare'],
    maxClarifyingQuestions: 4,
    knownFacts: [
      'Current path is choose service → pick date → pick slot → patient details → confirm.',
      'Users book on both desktop and phone.',
      'Error messages currently appear only as red borders with no text.',
      'Slots update live and can disappear while selecting.',
      'Focus order currently skips the calendar grid.',
    ],
    hiddenContext: [
      'There is a phone booking fallback staff prefer to push.',
      'Brand insists on a terracotta accent colour. Check contrast.',
      'Some services require a referral code.',
    ],
    successCriteria: [
      'Treats a11y as product requirement, not polish',
      'Designs visible focus, labels, and error text',
      'Handles race conditions on slot availability',
      'Plans assistive-tech validation',
    ],
  },
  {
    id: 'design-system-conflict',
    title: 'Resolve a design-system conflict',
    summary:
      'Two product teams shipped divergent patterns. Align them without a rewrite.',
    situation:
      'Growth and Core each shipped different filter + empty-state patterns. Engineers are blocked; Figma is diverging. You’re facilitating a whiteboard to pick a path.',
    goal:
      'Propose a unified pattern decision and migration plan that unblocks shipping this quarter.',
    asIs:
      'Growth uses a chip-based filter bar with illustrated empty states. Core uses dense table filters with text-only empties. Both are in production; neither team owns a shared component yet.',
    deliverables: [
      'Frame the conflict and who is affected',
      'Compare Growth vs Core options with tradeoffs',
      'Recommend a default + escape hatch',
      'Sketch the chosen pattern',
      'Outline a phased migration',
    ],
    durationMinutes: 25,
    difficulty: 'senior',
    focus: ['systems', 'governance', 'collaboration'],
    maxClarifyingQuestions: 5,
    knownFacts: [
      'Growth uses chip filters + illustrated empty states; Core uses dense table filters + text empties.',
      'Growth ships weekly; Core ships monthly.',
      'Design system team is two people.',
      'Analytics shows Growth’s filter pattern converts better on marketing pages.',
      'Engineers are blocked waiting for one shared component.',
    ],
    hiddenContext: [
      'Core’s pattern is better for dense data tables.',
      'A rewrite of Growth screens this quarter is politically impossible.',
      'Engineering lead wants one React component with variants.',
    ],
    successCriteria: [
      'Separates default vs contextual variants',
      'Avoids big-bang rewrite',
      'Names owners and decision criteria',
      'Shows empathy for both teams’ constraints',
    ],
  },
  {
    id: 'notifications-overload',
    title: 'Fix notification overload',
    summary:
      'Users mute the product. Redesign alerts so important events still surface.',
    situation:
      'NPS keeps saying “too many pings.” Email digest open rates are falling. You’re whiteboarding a notification strategy + UI for a collaboration tool.',
    goal:
      'Redesign how in-app, email, and push work together so important events still surface.',
    asIs:
      'Every comment on a watched doc fires in-app + email. @mentions and security alerts use the same channel mix. Digests are weekly and often ignored. Push exists but is noisy.',
    deliverables: [
      'Principles for what deserves interruption',
      'Information architecture for preferences',
      'Sketch inbox / digest / urgent alert patterns',
      'Migration plan for existing noisy rules',
    ],
    durationMinutes: 25,
    difficulty: 'mid',
    focus: ['notifications', 'preferences', 'trust'],
    maxClarifyingQuestions: 5,
    knownFacts: [
      'Current system emails + pings in-app on every watched-doc comment.',
      'Critical events today: @mentions and security alerts (same channels as noise).',
      'Noise: every comment on watched docs.',
      'Enterprise customers need admin-enforced defaults.',
      'Weekly digest open rates are falling.',
    ],
    hiddenContext: [
      'Push is disabled in the EU build pending legal review.',
      'Sales wants a “weekly wins” marketing email in the same system. Product prefers separation.',
    ],
    successCriteria: [
      'Defines urgency tiers',
      'Gives users clear control without dump-all-off',
      'Separates product vs marketing comms',
      'Considers admin vs individual settings',
    ],
  },
];

export function getWhiteboardChallenge(
  id: string,
): WhiteboardChallenge | undefined {
  return WHITEBOARD_CHALLENGES.find((c) => c.id === id);
}

export function listWhiteboardChallenges(): WhiteboardChallenge[] {
  return WHITEBOARD_CHALLENGES;
}
