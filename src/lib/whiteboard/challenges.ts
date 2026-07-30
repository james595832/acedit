export type WhiteboardDifficulty = 'junior' | 'mid' | 'senior';

export type WhiteboardChallenge = {
  id: string;
  title: string;
  summary: string;
  brief: string;
  /** One-line goal the candidate must address. */
  goal: string;
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

export const WHITEBOARD_CHALLENGES: WhiteboardChallenge[] = [
  {
    id: 'checkout-abandonment',
    title: 'Reduce checkout abandonment',
    summary:
      'Diagnose why shoppers drop at payment and sketch a clearer checkout flow.',
    goal:
      'Propose a revised mobile-web checkout that reduces drop-off without harming conversion trust.',
    deliverables: [
      'Clarify the problem and who is affected',
      'Map current → proposed checkout flow',
      'Sketch key screens / states (boxes + labels ok)',
      'Call out risks, success metrics, and a lean validation plan',
    ],
    brief: `A mid-market ecommerce brand sees ~68% cart abandonment between cart and payment confirmation. You’re the product designer in a 1:1 whiteboard.

Goal: propose a revised checkout experience for mobile web that reduces drop-off without harming conversion trust.

Deliver:
1) Clarify the problem and who is affected
2) Map the current → proposed flow
3) Sketch key screens / states (can be boxes + labels)
4) Call out risks, metrics, and a lean validation plan`,
    durationMinutes: 25,
    difficulty: 'mid',
    focus: ['conversion', 'mobile', 'flows'],
    maxClarifyingQuestions: 5,
    knownFacts: [
      'Top drop step is payment method entry (not shipping).',
      'Guest checkout exists but feels buried.',
      'Mobile is 72% of traffic.',
      'Support tickets mention unexpected fees late in flow.',
    ],
    hiddenContext: [
      'Average order value is £64.',
      'Apple Pay / Google Pay are not offered yet.',
      'Marketing wants a post-purchase upsell modal — product is skeptical.',
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
    goal:
      'Whiteboard an activation journey from invite → first insight shared with a teammate.',
    deliverables: [
      'Define what “activated” means as a concrete behavior',
      'Sequence the first-run experience',
      'Sketch empty states + guidance',
      'Decide what to defer vs force in setup',
      'Note analytics events you’d instrument',
    ],
    brief: `You’re designing onboarding for a B2B analytics SaaS. Signups are up, but only 22% of new workspaces complete a meaningful action in week one.

Goal: whiteboard an activation journey from invite → first insight shared with a teammate.

Deliver:
1) Define “activated”
2) Sequence the first-run experience
3) Sketch empty states + guidance
4) Decide what to defer vs force
5) Note analytics events you’d instrument`,
    durationMinutes: 30,
    difficulty: 'mid',
    focus: ['activation', 'saas', 'onboarding'],
    maxClarifyingQuestions: 5,
    knownFacts: [
      'Most signups are invited by a teammate, not organic solo.',
      'First value is usually “shared a dashboard with a comment”.',
      'Admins complain setup asks for too many integrations upfront.',
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
    goal:
      'Redesign choose service → pick slot → confirm with accessibility as a first-class constraint.',
    deliverables: [
      'Audit the riskiest accessibility failure points',
      'Propose interaction patterns (focus, errors, confirmation)',
      'Sketch the critical screens',
      'Explain how you’d test with real assistive tech',
    ],
    brief: `A clinic’s online booking tool fails WCAG on contrast, focus order, and form errors. Leadership wants a redesign that is usable with keyboard + screen readers without looking “clinical grey”.

Goal: redesign the “choose service → pick slot → confirm” path with accessibility as a first-class constraint.

Deliver:
1) Audit the riskiest failure points
2) Propose interaction patterns (focus, errors, confirmation)
3) Sketch the critical screens
4) Explain how you’d test with real assistive tech`,
    durationMinutes: 20,
    difficulty: 'junior',
    focus: ['accessibility', 'forms', 'healthcare'],
    maxClarifyingQuestions: 4,
    knownFacts: [
      'Users book on both desktop and phone.',
      'Error messages currently appear only as red borders.',
      'Slots update live and can disappear while selecting.',
    ],
    hiddenContext: [
      'There is a phone booking fallback staff prefer to push.',
      'Brand insists on a terracotta accent colour — check contrast.',
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
      'Two product teams shipped divergent patterns — align them without a rewrite.',
    goal:
      'Propose a unified pattern decision and migration plan that unblocks shipping this quarter.',
    deliverables: [
      'Frame the conflict and who is affected',
      'Compare options with tradeoffs',
      'Recommend a default + escape hatch',
      'Sketch the chosen pattern',
      'Outline a phased migration',
    ],
    brief: `Growth and Core each shipped different filter + empty-state patterns. Engineers are blocked; Figma is diverging. You’re facilitating a whiteboard to pick a path.

Goal: propose a unified pattern decision and migration plan that unblocks shipping this quarter.

Deliver:
1) Frame the conflict and who is affected
2) Compare options with tradeoffs
3) Recommend a default + escape hatch
4) Sketch the chosen pattern
5) Outline a phased migration`,
    durationMinutes: 25,
    difficulty: 'senior',
    focus: ['systems', 'governance', 'collaboration'],
    maxClarifyingQuestions: 5,
    knownFacts: [
      'Growth ships weekly; Core ships monthly.',
      'Design system team is two people.',
      'Analytics shows Growth’s filter pattern converts better on marketing pages.',
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
      'Users mute the product — redesign alerts so important events still surface.',
    goal:
      'Redesign how in-app, email, and push work together for a collaboration tool.',
    deliverables: [
      'Principles for what deserves interruption',
      'Information architecture for preferences',
      'Sketch inbox / digest / urgent alert patterns',
      'Migration plan for existing noisy rules',
    ],
    brief: `NPS comments keep saying “too many pings.” Open rates on email digests are falling. You’re whiteboarding a notification strategy + UI.

Goal: redesign how in-app, email, and push work together for a collaboration tool.

Deliver:
1) Principles for what deserves interruption
2) Information architecture for preferences
3) Sketch inbox / digest / urgent alert patterns
4) Migration plan for existing noisy rules`,
    durationMinutes: 25,
    difficulty: 'mid',
    focus: ['notifications', 'preferences', 'trust'],
    maxClarifyingQuestions: 5,
    knownFacts: [
      'Critical: @mentions and security alerts.',
      'Noise: every comment on watched docs.',
      'Enterprise customers need admin-enforced defaults.',
    ],
    hiddenContext: [
      'Push is disabled in the EU build pending legal review.',
      'Sales wants a “weekly wins” marketing email in the same system — product prefers separation.',
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
