'use client';

import {useRouter} from 'next/navigation';
import {Button} from '@astryxdesign/core/Button';

export function CreateInterviewButton({
  label = 'Create an interview',
}: {
  label?: string;
}) {
  const router = useRouter();
  return (
    <Button
      label={label}
      variant="primary"
      clickAction={() => {
        router.push('/interview');
      }}
    />
  );
}
