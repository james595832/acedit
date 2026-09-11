'use client';

import {useRouter} from 'next/navigation';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/Layout';
import {Section} from '@astryxdesign/core/Section';
import {markWelcomeDone} from '@/lib/interview/create-draft';
import {FIGMA_COPY} from '@/lib/interview/figma-copy';

export function WelcomeOnboarding({firstName}: {firstName: string}) {
  const router = useRouter();
  const copy = FIGMA_COPY.welcome;

  return (
    <Section variant="transparent" padding={4}>
      <VStack gap={5}>
        <VStack gap={3}>
          <Heading level={1}>{copy.title(firstName)}</Heading>
          <Text as="p" type="large" color="secondary">
            {copy.p1}
          </Text>
          <Text as="p" type="large" color="secondary">
            {copy.p2}
          </Text>
          <Text as="p" type="large" color="secondary">
            {copy.p3}
          </Text>
        </VStack>

        <Button
          label={copy.cta}
          variant="primary"
          clickAction={() => {
            markWelcomeDone();
            router.push('/interview');
          }}
        />
      </VStack>
    </Section>
  );
}
