'use client';

import {useRouter} from 'next/navigation';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/Layout';
import {markWelcomeDone} from '@/lib/interview/create-draft';

export function WelcomeOnboarding({firstName}: {firstName: string}) {
  const router = useRouter();

  return (
    <VStack gap={5} className="aced-flow aced-flow--welcome">
      <header className="aced-flow__intro">
        <Heading level={1}>Welcome {firstName},</Heading>
        <Text as="p" type="large" className="aced-flow__welcome-copy">
          First of all thank you for signing up to Aced-It. The place where we
          hope you can get yourself prepared for any interview in the design
          sector. With the rise of AI competition for designers is even more
          competitive.
        </Text>
        <Text as="p" type="large" className="aced-flow__welcome-copy">
          You probably signed up here because you have an interview coming up.
          So congratulations on that as even getting a recruiter call in 2026 is
          difficult.
        </Text>
        <Text as="p" type="large" className="aced-flow__welcome-copy">
          Lets get started on getting you ship shape for your next role!
        </Text>
      </header>

      <div className="aced-flow__actions">
        <Button
          label="Lets Go!"
          variant="primary"
          clickAction={() => {
            markWelcomeDone();
            router.push('/interview');
          }}
        />
      </div>
    </VStack>
  );
}
