'use client';

import Link from 'next/link';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Divider} from '@astryxdesign/core/Divider';

type PricingTrialDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const TIMELINE = [
  {
    day: 'Today',
    title: 'Start free',
    detail: 'Full access. Practice interviews with your CV — £0 today.',
  },
  {
    day: 'Day 4',
    title: 'Friendly reminder',
    detail: 'We’ll email you before billing starts so nothing is a surprise.',
  },
  {
    day: 'Day 5',
    title: 'Membership begins',
    detail: '£7.50 / month (or $9.99). Cancel anytime before then.',
  },
] as const;

const FEATURES = [
  'CV + job-description personalised questions',
  'Voice answers scored on process, craft & role fit',
  'Clear strong / weak criteria after every take',
  'Unlimited practice during your membership',
] as const;

export function PricingTrialDialog({
  isOpen,
  onOpenChange,
}: PricingTrialDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={448}
      maxHeight="88dvh"
      purpose="info"
      className="aced-trial-dialog"
    >
      <DialogHeader
        title="Start your 5-day free trial"
        subtitle="One plan. Clear timeline. Nothing charged today."
        onOpenChange={onOpenChange}
      />
      <div className="aced-trial-dialog-body">
        <VStack gap={5}>
          <VStack gap={2} className="aced-price-panel">
            <HStack gap={3} align="center" justify="between">
              <Heading level={3}>ACED-IT Pro</Heading>
              <HStack gap={2} align="end">
                <Text size="xl" weight="semibold">
                  £7.50
                </Text>
                <Text size="sm" color="secondary">
                  / mo
                </Text>
              </HStack>
            </HStack>
            <Text size="sm" color="secondary">
              Or $9.99 / month · Billed after trial · Cancel anytime
            </Text>
            <Divider />
            <VStack gap={2} as="ul" className="aced-price-features">
              {FEATURES.map(item => (
                <HStack key={item} gap={2} align="start" as="li">
                  <span className="aced-trial-check" aria-hidden="true">
                    ✓
                  </span>
                  <Text size="sm">{item}</Text>
                </HStack>
              ))}
            </VStack>
          </VStack>

          <VStack gap={3} as="ol" className="aced-trial-timeline">
            {TIMELINE.map((step, index) => (
              <HStack key={step.day} gap={3} align="start" as="li">
                <span className="aced-trial-day">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <VStack gap={1}>
                  <Text size="sm" weight="semibold">
                    {step.day} — {step.title}
                  </Text>
                  <Text size="sm" color="secondary">
                    {step.detail}
                  </Text>
                </VStack>
              </HStack>
            ))}
          </VStack>

          <div className="aced-trial-dialog-cta">
            <Link
              href="/signup?trial=5&plan=pro"
              className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg aced-mkt__btn--block"
              onClick={() => onOpenChange(false)}
            >
              Continue to create account
            </Link>
            <p className="aced-trial-fineprint">
              Stripe Checkout collects your card after account setup. You won’t
              be charged today — cancel anytime in Settings.
            </p>
          </div>
        </VStack>
      </div>
    </Dialog>
  );
}
