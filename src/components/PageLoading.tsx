import {Section} from '@astryxdesign/core/Section';
import {VStack} from '@astryxdesign/core/Layout';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Text} from '@astryxdesign/core/Text';

export function PageLoading({label = 'Loading'}: {label?: string}) {
  return (
    <Section variant="transparent" padding={4} aria-busy="true" aria-live="polite">
      <VStack gap={4}>
        <Text as="p" type="label" color="secondary">
          {label}
        </Text>
        <Skeleton width="40%" height="2rem" index={0} />
        <Skeleton width="100%" height="6rem" index={1} />
        <Skeleton width="100%" height="6rem" index={2} />
      </VStack>
    </Section>
  );
}
