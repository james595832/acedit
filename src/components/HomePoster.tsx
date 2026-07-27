import Link from 'next/link';

export function HomePoster() {
  return (
    <main className="aced-hero">
      <div className="aced-hero__copy">
        <p className="aced-hero__brand" aria-hidden="true">
          ACED IT
        </p>
        <h1 className="aced-hero__title">
          Designed to
          <br />
          ace something.
        </h1>
        <Link className="aced-hero__link" href="/studio">
          Start a practice interview
          <span aria-hidden="true"> →</span>
        </Link>
      </div>

      <div className="aced-hero__stage" aria-hidden="true">
        <svg
          className="aced-hero__rays"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {Array.from({length: 18}).map((_, i) => {
            const a = (i / 18) * Math.PI * 2;
            const x2 = 50 + Math.cos(a) * 70;
            const y2 = 50 + Math.sin(a) * 70;
            return (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={x2}
                y2={y2}
                className="aced-hero__ray"
              />
            );
          })}
        </svg>

        <div className="aced-sculpture">
          <span className="aced-sculpture__block aced-sculpture__block--a" />
          <span className="aced-sculpture__block aced-sculpture__block--b" />
          <span className="aced-sculpture__block aced-sculpture__block--c" />
          <span className="aced-sculpture__glow" />
          <span className="aced-sculpture__lamp" />
        </div>

        <svg className="aced-hero__neon" viewBox="0 0 120 160" fill="none">
          <path
            d="M20 140 L45 40 L70 95 L95 20 L110 140"
            stroke="currentColor"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <footer className="aced-hero__footer">
        <p className="aced-hero__hint">
          Speak aloud · Scored on process, craft &amp; role fit
        </p>
        <aside className="aced-hero__card">
          <p className="aced-hero__card-kicker">Practice studio</p>
          <p className="aced-hero__card-body">
            CV + job description in. Personalised questions and clear strong /
            weak answer criteria out.
          </p>
        </aside>
      </footer>
    </main>
  );
}
