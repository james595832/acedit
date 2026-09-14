import {Button} from '@astryxdesign/core/Button';

export function CreateInterviewButton({
  label = 'Create an interview',
}: {
  label?: string;
}) {
  return <Button label={label} variant="primary" href="/interview" />;
}
