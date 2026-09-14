import {describe, expect, it} from 'vitest';
import {analyzeCvLocally} from '@/lib/cv-parse';
import {generateQuestions} from '@/lib/ai';
import {
  buildSeriesHistoryTiles,
  canStartStage,
  draftExecRoundQuestions,
  draftTeamRoundQuestions,
  isRoundPassed,
  pickExecPersona,
} from '@/lib/interview/rounds';
import type {TrackQuestionContext} from '@/lib/interview/tracks';

process.env.USE_STUBS = 'true';
delete process.env.SUPABASE_SERVICE_KEY;

const CV = analyzeCvLocally(
  'Jane Okonkwo, Product designer at Northloop. Housing map in Figma.',
);

const CTX: TrackQuestionContext = {
  skill: 'Figma',
  project: 'Housing map',
  company: 'Northloop',
  role: 'Product designer',
  years: '5 years',
  jdFocus: 'shipping with engineers',
  hasCompany: true,
  hasJd: true,
  jdWantsAi: false,
  cvUsesAi: false,
};

describe('round unlock', () => {
  it('passes only at 60+ with most answers graded', () => {
    expect(
      isRoundPassed({overall: 55, gradedCount: 9, questionCount: 10}),
    ).toBe(false);
    expect(
      isRoundPassed({overall: 60, gradedCount: 9, questionCount: 10}),
    ).toBe(true);
    expect(
      isRoundPassed({overall: 80, gradedCount: 2, questionCount: 10}),
    ).toBe(false);
    expect(
      isRoundPassed({overall: null, gradedCount: 10, questionCount: 10}),
    ).toBe(false);
  });

  it('blocks stage 2 unless the latest round 1 passed', () => {
    const locked = canStartStage({
      requestedStage: 2,
      prior: {overall: 55, gradedCount: 10, questionCount: 10},
    });
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.status).toBe(403);

    const open = canStartStage({
      requestedStage: 2,
      prior: {overall: 60, gradedCount: 8, questionCount: 10},
    });
    expect(open.ok).toBe(true);
  });

  it('blocks stage 3 unless the latest team round passed', () => {
    const locked = canStartStage({
      requestedStage: 3,
      prior: {overall: 59, gradedCount: 6, questionCount: 6},
    });
    expect(locked.ok).toBe(false);

    const open = canStartStage({
      requestedStage: 3,
      prior: {overall: 61, gradedCount: 5, questionCount: 6},
    });
    expect(open.ok).toBe(true);
  });
});

describe('exec picker', () => {
  it('picks a CEO for startup + product', () => {
    expect(
      pickExecPersona({
        orgPace: 'startup',
        processStance: 'prototype_first',
        trackFamily: 'product',
        jdText: 'Seed-stage product designer. Move fast.',
      }),
    ).toBe('ceo');
  });

  it('picks a CIO for established intern-at-enterprise', () => {
    expect(
      pickExecPersona({
        orgPace: 'established',
        processStance: 'classic',
        trackFamily: 'intern_visual',
        jdText:
          'Intern graphic designer at a Fortune 500 enterprise with heavy governance.',
      }),
    ).toBe('cio');
  });
});

describe('later-round questions', () => {
  it('builds a team blob with engineer, PM, and senior designer — no second intro', () => {
    const questions = draftTeamRoundQuestions(CTX, CV, null);
    expect(questions).toHaveLength(6);
    expect(questions.some((q) => /tell me about yourself/i.test(q.text))).toBe(
      false,
    );
    expect(questions.filter((q) => q.persona === 'engineer')).toHaveLength(2);
    expect(questions.filter((q) => q.persona === 'pm')).toHaveLength(2);
    expect(questions.filter((q) => q.persona === 'senior_designer')).toHaveLength(
      2,
    );
  });

  it('builds five CEO or CIO questions', () => {
    const ceo = draftExecRoundQuestions('ceo', CTX, CV, null);
    const cio = draftExecRoundQuestions('cio', CTX, CV, null);
    expect(ceo).toHaveLength(5);
    expect(cio).toHaveLength(5);
    expect(ceo.every((q) => q.persona === 'ceo')).toBe(true);
    expect(cio.every((q) => q.persona === 'cio')).toBe(true);
    expect(ceo.some((q) => /tell me about yourself/i.test(q.text))).toBe(false);
  });

  it('generateQuestions respects the round', async () => {
    const team = await generateQuestions({
      cvText: CV.parsed_text,
      analysis: CV,
      role: 'Product designer',
      orgPace: 'startup',
      processStance: 'prototype_first',
      round: 2,
    });
    expect(team).toHaveLength(6);
    expect(team.some((q) => /tell me about yourself/i.test(q.text))).toBe(false);
    expect(new Set(team.map((q) => q.persona))).toEqual(
      new Set(['engineer', 'pm', 'senior_designer']),
    );

    const exec = await generateQuestions({
      cvText: CV.parsed_text,
      analysis: CV,
      role: 'Product designer',
      orgPace: 'startup',
      processStance: 'prototype_first',
      round: 3,
    });
    expect(exec).toHaveLength(5);
    expect(exec.every((q) => q.persona === 'ceo')).toBe(true);
  });
});

describe('hub series tiles', () => {
  it('shows 1 of 3 / 2 of 3 and the next open action — not a lifetime score', () => {
    const tiles = buildSeriesHistoryTiles([
      {
        id: 's1',
        series_id: 'series-a',
        stage_number: 1,
        overall_score: 72,
        created_at: '2026-09-01T10:00:00.000Z',
        role_title: 'Product designer',
        company_name: 'Northloop',
      },
      {
        id: 's2',
        series_id: 'series-a',
        stage_number: 2,
        overall_score: 55,
        created_at: '2026-09-02T10:00:00.000Z',
        role_title: 'Product designer',
        company_name: 'Northloop',
      },
    ]);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]?.series_progress).toBe('2 of 3');
    expect(tiles[0]?.next_label).toBe('Retake this round');
    expect(tiles[0]?.next_stage).toBe(2);
    expect(tiles[0]?.overall_score).toBe(55);

    const unlocked = buildSeriesHistoryTiles([
      {
        id: 's1',
        series_id: 'series-b',
        stage_number: 1,
        overall_score: 72,
        created_at: '2026-09-01T10:00:00.000Z',
        role_title: 'Product designer',
        company_name: 'Northloop',
      },
    ]);
    expect(unlocked[0]?.series_progress).toBe('1 of 3');
    expect(unlocked[0]?.next_label).toBe('Meet the team');
    expect(unlocked[0]?.next_stage).toBe(2);

    const orphan = buildSeriesHistoryTiles([
      {
        id: 'orphan',
        series_id: null,
        stage_number: 1,
        overall_score: 48,
        created_at: '2026-09-03T10:00:00.000Z',
        role_title: 'Product designer',
        company_name: null,
      },
    ]);
    expect(orphan[0]?.next_label).toBe('Retake this round');
    expect(orphan[0]?.next_stage).toBe(1);
  });
});
