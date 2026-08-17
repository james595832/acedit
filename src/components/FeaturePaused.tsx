import Link from 'next/link';

type FeaturePausedProps = {
  title: string;
  lead: string;
  roadmapHash?: string;
};

export function FeaturePaused({
  title,
  lead,
  roadmapHash = '#next',
}: FeaturePausedProps) {
  return (
    <div className="aced-paused">
      <p className="aced-paused__status">Coming next</p>
      <h1>{title}</h1>
      <p className="aced-paused__lead">{lead}</p>
      <p className="aced-paused__note">
        We’re focusing on making practice interviews seamless first. This
        feature is on the roadmap and will return when it’s ready to trust.
      </p>
      <div className="aced-paused__actions">
        <Link className="aced-home__primary" href="/interview">
          Start interview
        </Link>
        <Link className="aced-orient__cta" href={`/roadmap${roadmapHash}`}>
          See roadmap →
        </Link>
      </div>
    </div>
  );
}
