'use client';

import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Banner} from '@astryxdesign/core/Banner';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import type {GradeResult} from '@/lib/types';

type GradeFeedbackProps = {
  grade: GradeResult;
};

const AXIS_LABELS: Array<{
  key: keyof GradeResult['scoreBreakdown'];
  label: string;
}> = [
  {key: 'designThinking', label: 'Design thinking'},
  {key: 'communication', label: 'Communication'},
  {key: 'depth', label: 'Depth / specificity'},
  {key: 'knowledge', label: 'Design knowledge'},
  {key: 'roleFit', label: 'Role fit (JD + must-cover)'},
];

export function GradeFeedback({grade}: GradeFeedbackProps) {
  const ev = grade.evaluatedAgainst;
  const tone =
    grade.score >= 70 ? 'strong' : grade.score >= 50 ? 'okay' : 'weak';

  return (
    <VStack gap={4}>
      <section className={`aced-score-hero aced-score-hero--${tone}`}>
        <p className="aced-score-hero__kicker">Answer score</p>
        {tone === 'strong' ? (
          <p className="aced-score-hero__celebrate" role="status">
            <span className="aced-score-hero__celebrate-check" aria-hidden="true">
              ✓
            </span>
            Strong answer. This would land in the room.
          </p>
        ) : null}
        <p className="aced-score-hero__value" aria-label={`${grade.score} out of 100`}>
          {grade.score}
          <span className="aced-score-hero__denom">/100</span>
        </p>
        <ProgressBar
          label="Overall score"
          isLabelHidden
          value={grade.score}
          max={100}
          variant={
            grade.score >= 70
              ? 'success'
              : grade.score >= 50
                ? 'warning'
                : 'error'
          }
        />
        <Text as="p" color="secondary">
          {grade.feedback}
        </Text>
      </section>

      <VStack gap={2}>
        <Heading level={3}>Must-cover checklist</Heading>
        <Text as="p" color="secondary">
          Scored against the rubric for this question, not a secret model essay.
        </Text>
        <ul className="aced-check">
          {ev.mustCover.map((item) => {
            const hit = ev.mustCoverHit.includes(item);
            return (
              <li
                key={item}
                className={`aced-check__item${hit ? ' aced-check__item--hit' : ' aced-check__item--miss'}`}
              >
                <StatusDot
                  variant={hit ? 'success' : 'neutral'}
                  label={hit ? 'Covered' : 'Missed'}
                />
                <span>
                  <span className="aced-check__state">
                    {hit ? 'Covered' : 'Missed'}
                  </span>
                  {item}
                </span>
              </li>
            );
          })}
        </ul>
        {ev.weakSignalsHit.length > 0 ? (
          <VStack gap={1}>
            <Text type="label">Weak patterns detected</Text>
            {ev.weakSignalsHit.map((item) => (
              <Text key={item} as="p" color="secondary">
                • {item}
              </Text>
            ))}
          </VStack>
        ) : null}
        {ev.roleKeywordsHit.length > 0 ? (
          <Text as="p" color="secondary">
            JD keywords hit: {ev.roleKeywordsHit.join(', ')}
          </Text>
        ) : null}
        {(ev.cvEvidenceHit?.length ?? 0) > 0 ||
        (ev.cvEvidenceMissed?.length ?? 0) > 0 ? (
          <VStack gap={1}>
            <Text type="label">CV evidence</Text>
            {(ev.cvEvidenceHit ?? []).map((item) => (
              <Text key={`hit-${item}`} as="p" color="secondary">
                ✓ Referenced: {item}
              </Text>
            ))}
            {(ev.cvEvidenceMissed ?? []).slice(0, 3).map((item) => (
              <Text key={`miss-${item}`} as="p" color="secondary">
                ○ Not cited: {item}
              </Text>
            ))}
          </VStack>
        ) : null}
      </VStack>

      <Divider />

      <VStack gap={3}>
        <Heading level={3}>Score breakdown (0 to 10)</Heading>
        {AXIS_LABELS.map(({key, label}) => (
          <VStack key={key} gap={1}>
            <HStack justify="between" align="center">
              <Text type="label">{label}</Text>
              <Text type="label" color="secondary">
                {grade.scoreBreakdown[key]}/10
              </Text>
            </HStack>
            <ProgressBar
              label={label}
              isLabelHidden
              value={grade.scoreBreakdown[key]}
              max={10}
              variant="neutral"
            />
          </VStack>
        ))}
      </VStack>

      {grade.strengths.length > 0 ? (
        <VStack gap={2}>
          <Heading level={3}>Strengths</Heading>
          <ul className="aced-signal aced-signal--up">
            {grade.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </VStack>
      ) : null}

      {grade.improvements.length > 0 ? (
        <VStack gap={2}>
          <Heading level={3}>Improve next time</Heading>
          <ul className="aced-signal aced-signal--next">
            {grade.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </VStack>
      ) : null}

      {grade.stub ? (
        <Banner
          status="info"
          title="Local grader"
          description="Running without Anthropic. Criteria still come from your CV + JD."
        />
      ) : null}
    </VStack>
  );
}
