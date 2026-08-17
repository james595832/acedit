import {CHEAP_ANTHROPIC_MODEL, useStubs} from '@/lib/config';
import {
  formatChallengeBrief,
  type WhiteboardChallenge,
} from '@/lib/whiteboard/challenges';

export type ClarifyingMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type WhiteboardBoard = {
  framing: string;
  users: string;
  flows: string;
  solution: string;
  tradeoffs: string;
};

export type DeliverableStatus = 'met' | 'partial' | 'missed';

export type DeliverableAssessment = {
  item: string;
  status: DeliverableStatus;
  note: string;
};

export type WhiteboardDebrief = {
  score: number;
  /** Did they answer the challenge goal? */
  againstAsk: string;
  summary: string;
  deliverables: DeliverableAssessment[];
  strengths: string[];
  improvements: string[];
  criteriaHit: string[];
  criteriaMissed: string[];
  /** How the sketch supports (or fails) the ask. */
  sketchAssessment: string;
  stub?: boolean;
};

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function pickFact(
  facts: string[],
  needles: string[],
): string | undefined {
  return facts.find((fact) => {
    const lower = fact.toLowerCase();
    return needles.some((n) => lower.includes(n));
  });
}

function stubClarifyingReply(
  challenge: WhiteboardChallenge,
  question: string,
): string {
  const q = question.toLowerCase();
  const pool = [...challenge.knownFacts, ...challenge.hiddenContext];

  const matched = challenge.knownFacts.find((fact) => {
    const keys = fact.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    return keys.some((k) => q.includes(k));
  });

  if (matched) {
    return `${matched} What would you change first based on that?`;
  }

  if (
    q.includes('current') ||
    q.includes('today') ||
    q.includes('existing') ||
    q.includes('as-is') ||
    q.includes('flow')
  ) {
    const flowFact =
      pickFact(challenge.knownFacts, [
        'flow',
        'checkout',
        'cart',
        'payment',
        'shipping',
        'current',
      ]) ?? challenge.knownFacts[0];
    if (flowFact) {
      return `${flowFact} Sketch the as-is briefly, then your proposed path.`;
    }
  }

  if (
    q.includes('metric') ||
    q.includes('success') ||
    q.includes('kpi') ||
    q.includes('measure')
  ) {
    const metricFact = pickFact(pool, ['metric', 'abandon', 'nps', 'rate', '%']);
    if (metricFact) {
      return `${metricFact} Propose one primary success metric you’d watch in 4–6 weeks.`;
    }
    return 'We care about a metric you can move in 4–6 weeks. What’s your primary success measure, and one guardrail you won’t sacrifice?';
  }

  if (q.includes('user') || q.includes('persona') || q.includes('who')) {
    const userFact =
      pickFact(challenge.knownFacts, [
        'user',
        'shopper',
        'mobile',
        'guest',
        'signup',
        'invite',
        'admin',
        'traffic',
      ]) ?? challenge.knownFacts.find((f) => /mobile|guest|user|traffic/i.test(f));
    if (userFact) {
      return `${userFact} Name one primary segment you’d design for first.`;
    }
    return 'Primary traffic is whatever the brief implies — pick one primary segment and one secondary, and say why.';
  }

  if (q.includes('constraint') || q.includes('timeline') || q.includes('tech')) {
    return `${challenge.knownFacts[0] ?? 'Ship something believable this quarter.'} Engineering capacity is limited, so prefer patterns you can phase.`;
  }

  if (q.includes('fee') || q.includes('trust') || q.includes('payment')) {
    const trustFact = pickFact(pool, ['fee', 'pay', 'trust', 'support']);
    if (trustFact) {
      return `${trustFact} How would you surface that earlier without killing conversion?`;
    }
  }

  const fallbackFact = challenge.knownFacts[0];
  if (fallbackFact) {
    return `Useful context: ${fallbackFact} Ask me something more specific (drop-off step, users, constraints, or success).`;
  }

  return `Ask something specific about users, constraints, data, or success for “${challenge.title}”. I can share facts from the brief — I won’t design the board for you.`;
}

export async function answerClarifyingQuestion(input: {
  challenge: WhiteboardChallenge;
  messages: ClarifyingMessage[];
}): Promise<string> {
  const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    return 'Ask a clarifying question about the brief when you’re ready.';
  }

  if (useStubs()) {
    return stubClarifyingReply(input.challenge, lastUser.content);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const system = `You are a senior design interviewer running a live whiteboard challenge.

Challenge title: ${input.challenge.title}
Candidate brief (they can see this):
${formatChallengeBrief(input.challenge)}

Facts you may reveal if asked well:
${input.challenge.knownFacts.map((f) => `- ${f}`).join('\n')}

Internal context (reveal sparingly only if directly asked):
${input.challenge.hiddenContext.map((f) => `- ${f}`).join('\n')}

Rules:
- Stay strictly in scope of this challenge. Refuse off-topic requests.
- When they ask a real clarifying question, lead with ONE concrete fact from knownFacts (or hiddenContext only if directly asked). Do not answer with vague “assume a user” coaching.
- After the fact, add one short nudge so they decide (under 90 words total).
- Do not write their flows, screens, or final recommendation for them.
- If they ask you to design/solve it, decline and redirect them to the board.
- If they ask about the current/as-is flow, give the relevant known fact so they can map current → proposed.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CHEAP_ANTHROPIC_MODEL,
      max_tokens: 320,
      system,
      messages: input.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    return stubClarifyingReply(input.challenge, lastUser.content);
  }

  const data = (await response.json()) as {
    content: Array<{type: string; text?: string}>;
  };
  return (
    data.content.find((c) => c.type === 'text')?.text?.trim() ||
    stubClarifyingReply(input.challenge, lastUser.content)
  );
}

function sectionLooksCovered(text: string, keywords: string[]): boolean {
  const blob = text.toLowerCase();
  if (blob.trim().length < 24) return false;
  return keywords.some((k) => blob.includes(k));
}

function assessDeliverableLocally(
  item: string,
  board: WhiteboardBoard,
  hasSketch: boolean,
  clarifyingUsed: number,
): DeliverableAssessment {
  const blob = Object.values(board).join('\n').toLowerCase();
  const lower = item.toLowerCase();

  if (lower.includes('sketch') || lower.includes('screen')) {
    if (hasSketch && (board.solution.trim().length > 20 || board.flows.trim().length > 20)) {
      return {
        item,
        status: 'met',
        note: 'Sketch present and solution/flow notes support what you drew.',
      };
    }
    if (hasSketch) {
      return {
        item,
        status: 'partial',
        note: 'You sketched, but the talk track barely explains the screens/states.',
      };
    }
    if (board.solution.trim().length > 40) {
      return {
        item,
        status: 'partial',
        note: 'Described a solution in notes, but no canvas sketch was saved.',
      };
    }
    return {
      item,
      status: 'missed',
      note: 'The ask required a sketch of key screens or states. None found.',
    };
  }

  if (lower.includes('clarif') || lower.includes('who is affected') || lower.includes('problem')) {
    const hasUsers = sectionLooksCovered(board.users, [
      'user',
      'shopper',
      'admin',
      'team',
      'customer',
      'patient',
    ]);
    const hasFraming = board.framing.trim().length > 30;
    if ((hasUsers || hasFraming) && clarifyingUsed > 0) {
      return {
        item,
        status: 'met',
        note: 'You framed the problem and used clarifying questions.',
      };
    }
    if (hasUsers || hasFraming) {
      return {
        item,
        status: 'partial',
        note: 'Some problem framing exists, but clarifying depth is thin.',
      };
    }
    return {
      item,
      status: 'missed',
      note: 'Little evidence you clarified the problem or affected users.',
    };
  }

  if (lower.includes('flow') || lower.includes('sequence') || lower.includes('journey')) {
    if (
      sectionLooksCovered(board.flows, [
        '→',
        '->',
        'step',
        'flow',
        'then',
        'current',
        'proposed',
      ])
    ) {
      return {
        item,
        status: 'met',
        note: 'Flow notes show a sequenced path.',
      };
    }
    return {
      item,
      status: board.flows.trim().length > 20 ? 'partial' : 'missed',
      note:
        board.flows.trim().length > 20
          ? 'Flow section started, but current → proposed is unclear.'
          : 'No clear flow / sequence against the ask.',
    };
  }

  if (
    lower.includes('metric') ||
    lower.includes('validation') ||
    lower.includes('risk') ||
    lower.includes('migration') ||
    lower.includes('analytics') ||
    lower.includes('test')
  ) {
    if (
      sectionLooksCovered(board.tradeoffs, [
        'metric',
        'measure',
        'risk',
        'test',
        'validate',
        'kpi',
        'event',
        'migrat',
        '%',
      ])
    ) {
      return {
        item,
        status: 'met',
        note: 'Tradeoffs cover measurement, risk, or next validation.',
      };
    }
    return {
      item,
      status: board.tradeoffs.trim().length > 20 ? 'partial' : 'missed',
      note: 'Missing a concrete metric, risk, or validation plan tied to the goal.',
    };
  }

  // Generic keyword overlap against board text
  const keys = lower
    .split(/\W+/)
    .filter((w) => w.length > 4)
    .slice(0, 5);
  const hits = keys.filter((k) => blob.includes(k)).length;
  if (hits >= 2 && blob.length > 160) {
    return {item, status: 'met', note: 'Covered in your board notes.'};
  }
  if (hits >= 1 || blob.length > 220) {
    return {
      item,
      status: 'partial',
      note: 'Touched lightly. Strengthen how this maps to the goal.',
    };
  }
  return {
    item,
    status: 'missed',
    note: 'Not evidenced in the talk track or sketch.',
  };
}

function scoreFromDeliverables(deliverables: DeliverableAssessment[]): number {
  if (deliverables.length === 0) return 40;
  const points = deliverables.reduce((sum, d) => {
    if (d.status === 'met') return sum + 1;
    if (d.status === 'partial') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / deliverables.length) * 100);
}

function stubDebrief(
  challenge: WhiteboardChallenge,
  board: WhiteboardBoard,
  clarifyingUsed: number,
  hasSketch: boolean,
): WhiteboardDebrief {
  const blob = Object.values(board).join('\n').toLowerCase();
  const deliverables = challenge.deliverables.map((item) =>
    assessDeliverableLocally(item, board, hasSketch, clarifyingUsed),
  );

  const criteriaHit: string[] = [];
  const criteriaMissed: string[] = [];
  for (const item of challenge.successCriteria) {
    const keys = item
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 5)
      .slice(0, 3);
    const hit = keys.some((k) => blob.includes(k));
    if (hit && blob.length > 100) criteriaHit.push(item);
    else criteriaMissed.push(item);
  }

  const score = Math.min(
    95,
    Math.max(
      18,
      scoreFromDeliverables(deliverables) * 0.75 +
        criteriaHit.length * 4 +
        (hasSketch ? 6 : 0) +
        (clarifyingUsed > 0 ? 4 : 0),
    ),
  );

  const met = deliverables.filter((d) => d.status === 'met').length;
  const missed = deliverables.filter((d) => d.status === 'missed').length;

  return {
    score: Math.round(score),
    againstAsk:
      missed === 0 && met >= Math.ceil(deliverables.length * 0.6)
        ? `Mostly addresses the goal: ${challenge.goal}`
        : missed >= deliverables.length / 2
          ? `Only partially addresses the goal: ${challenge.goal}. Several required deliverables are missing.`
          : `You engaged the brief, but the work only partly answers: ${challenge.goal}`,
    summary:
      missed === 0
        ? 'Strong coverage of the ask. Sharpen the weakest deliverable note and make the success metric unmistakable.'
        : 'Assessed against the challenge deliverables. Close the missed items next time so the board clearly answers the ask.',
    deliverables,
    strengths:
      criteriaHit.length > 0
        ? criteriaHit.slice(0, 3)
        : deliverables
            .filter((d) => d.status === 'met')
            .slice(0, 3)
            .map((d) => d.item),
    improvements: (() => {
      const gaps = deliverables
        .filter((d) => d.status !== 'met')
        .slice(0, 3)
        .map((d) => `${d.item}: ${d.note}`);
      return gaps.length > 0 ? gaps : criteriaMissed.slice(0, 3);
    })(),
    criteriaHit,
    criteriaMissed,
    sketchAssessment: hasSketch
      ? 'Board saved (marker and/or post-its). Check it shows the critical screens and states named in the ask, not only decorative marks.'
      : 'No board content saved. This ask expected a visual board with sketches and/or labelled post-its.',
    stub: true,
  };
}

function normalizeDebrief(
  parsed: Partial<WhiteboardDebrief>,
  challenge: WhiteboardChallenge,
  board: WhiteboardBoard,
  clarifyingUsed: number,
  hasSketch: boolean,
): WhiteboardDebrief {
  const fallback = stubDebrief(challenge, board, clarifyingUsed, hasSketch);
  const deliverables =
    Array.isArray(parsed.deliverables) && parsed.deliverables.length > 0
      ? parsed.deliverables.map((d, i) => ({
          item:
            typeof d.item === 'string' && d.item.trim()
              ? d.item
              : challenge.deliverables[i] ?? `Deliverable ${i + 1}`,
          status:
            d.status === 'met' || d.status === 'partial' || d.status === 'missed'
              ? d.status
              : 'partial',
          note:
            typeof d.note === 'string' && d.note.trim()
              ? d.note
              : 'No note provided.',
        }))
      : fallback.deliverables;

  return {
    score:
      typeof parsed.score === 'number'
        ? Math.max(0, Math.min(100, Math.round(parsed.score)))
        : fallback.score,
    againstAsk:
      typeof parsed.againstAsk === 'string' && parsed.againstAsk.trim()
        ? parsed.againstAsk
        : fallback.againstAsk,
    summary:
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary
        : fallback.summary,
    deliverables,
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.map(String)
      : fallback.strengths,
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.map(String)
      : fallback.improvements,
    criteriaHit: Array.isArray(parsed.criteriaHit)
      ? parsed.criteriaHit.map(String)
      : fallback.criteriaHit,
    criteriaMissed: Array.isArray(parsed.criteriaMissed)
      ? parsed.criteriaMissed.map(String)
      : fallback.criteriaMissed,
    sketchAssessment:
      typeof parsed.sketchAssessment === 'string' &&
      parsed.sketchAssessment.trim()
        ? parsed.sketchAssessment
        : fallback.sketchAssessment,
    stub: false,
  };
}

function sketchBase64(dataUrl: string | null | undefined): string | null {
  if (!dataUrl) return null;
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!match?.[1] || match[1].length > 6_000_000) return null;
  return match[1];
}

export async function debriefWhiteboard(input: {
  challenge: WhiteboardChallenge;
  board: WhiteboardBoard;
  clarifyingUsed: number;
  sketchDataUrl?: string | null;
  hasSketch?: boolean;
}): Promise<WhiteboardDebrief> {
  const hasSketch = Boolean(input.hasSketch || input.sketchDataUrl);

  if (useStubs()) {
    return stubDebrief(
      input.challenge,
      input.board,
      input.clarifyingUsed,
      hasSketch,
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const imageData = sketchBase64(input.sketchDataUrl);

  const promptText = `You are a senior design interviewer assessing a timed whiteboard practice.

Judge whether the candidate answered THIS ASK — not whether the board looks busy.

Challenge: ${input.challenge.title}
Goal: ${input.challenge.goal}
Full brief:
${formatChallengeBrief(input.challenge)}

Required deliverables (score each met | partial | missed with a short evidence note):
${input.challenge.deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Success criteria (quality bar):
${input.challenge.successCriteria.map((c) => `- ${c}`).join('\n')}

Clarifying questions used: ${input.clarifyingUsed}/${input.challenge.maxClarifyingQuestions}
Sketch attached: ${imageData ? 'yes — inspect the image for flows/screens/labels/post-it notes relevant to the ask' : 'no'}

Candidate talk track:
Framing: ${input.board.framing || '(empty)'}
Users: ${input.board.users || '(empty)'}
Flows: ${input.board.flows || '(empty)'}
Solution: ${input.board.solution || '(empty)'}
Tradeoffs: ${input.board.tradeoffs || '(empty)'}

Rules:
- Score primarily on answering the goal + covering deliverables with evidence from notes/sketch.
- Empty or vague sections should be missed/partial, not charitable meets.
- If a deliverable requires sketching and there is no useful sketch, mark missed or partial.
- againstAsk must explicitly say how well they answered the goal.
- sketchAssessment must say what the sketch shows relative to the ask (or that it was missing).
- Keep notes concrete and under 25 words each.

Return ONLY JSON:
{
  "score": 0-100,
  "againstAsk": "...",
  "summary": "...",
  "deliverables": [{"item":"...","status":"met|partial|missed","note":"..."}],
  "strengths": ["..."],
  "improvements": ["..."],
  "criteriaHit": ["..."],
  "criteriaMissed": ["..."],
  "sketchAssessment": "..."
}`;

  type ContentPart =
    | {type: 'text'; text: string}
    | {
        type: 'image';
        source: {type: 'base64'; media_type: 'image/png'; data: string};
      };

  const content: ContentPart[] = [];
  if (imageData) {
    content.push({
      type: 'image',
      source: {type: 'base64', media_type: 'image/png', data: imageData},
    });
  }
  content.push({type: 'text', text: promptText});

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CHEAP_ANTHROPIC_MODEL,
      max_tokens: 1400,
      messages: [{role: 'user', content}],
    }),
  });

  if (!response.ok) {
    return stubDebrief(
      input.challenge,
      input.board,
      input.clarifyingUsed,
      hasSketch,
    );
  }

  const data = (await response.json()) as {
    content: Array<{type: string; text?: string}>;
  };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '{}';
  try {
    const parsed = JSON.parse(extractJsonObject(text)) as Partial<WhiteboardDebrief>;
    return normalizeDebrief(
      parsed,
      input.challenge,
      input.board,
      input.clarifyingUsed,
      hasSketch,
    );
  } catch {
    return stubDebrief(
      input.challenge,
      input.board,
      input.clarifyingUsed,
      hasSketch,
    );
  }
}
