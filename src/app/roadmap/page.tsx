import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Roadmap | ACED-IT',
  description:
    'What we have shipped and what we plan to release, month by month.',
};

type RoadmapEntry = {
  title: string;
  body: string;
  /** Plain status text — not a pill. */
  status?: 'Shipped' | 'In progress' | 'Planned';
};

type RoadmapMonth = {
  id: string;
  period: string;
  entries: RoadmapEntry[];
};

const MONTHS: RoadmapMonth[] = [
  {
    id: 'august-2026',
    period: 'August 2026',
    entries: [
      {
        title: 'Practice interviews',
        body: 'CV upload, optional job description, five spoken answers, graded feedback.',
        status: 'Shipped',
      },
      {
        title: 'Session results',
        body: 'Overall score, answer-by-answer notes, and a clear path to practise again.',
        status: 'Shipped',
      },
    ],
  },
  {
    id: 'september-2026',
    period: 'September 2026',
    entries: [
      {
        title: 'Interview loop hardening',
        body: 'Mic, transcript, grading, and save reliability — the soft-launch priority.',
        status: 'In progress',
      },
      {
        title: 'Whiteboard challenges',
        body: 'Timed design prompts, marker board, clarifying questions. Returns when the interview room is solid.',
        status: 'Planned',
      },
      {
        title: 'Portfolio review',
        body: 'Case study check with optional JD fit. Same bar as interviews before it goes live again.',
        status: 'Planned',
      },
    ],
  },
  {
    id: 'october-2026',
    period: 'October 2026',
    entries: [
      {
        title: 'Practice streaks',
        body: 'A light reason to come back each week — progress on your last score, not a vanity board.',
        status: 'Planned',
      },
    ],
  },
  {
    id: '2027',
    period: '2027',
    entries: [
      {
        title: 'Employer introductions',
        body: 'Only after practice scores are trusted. Proof first, then a small set of intros.',
        status: 'Planned',
      },
      {
        title: 'Hiring partner pipeline',
        body: 'Companies pay for candidates who already match the role. Fairer than LinkedIn spray-and-pray.',
        status: 'Planned',
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <article className="aced-roadmap">
      <header className="aced-roadmap__intro">
        <h1>Roadmap</h1>
        <p>
          What we have shipped and what we expect to release. Dates can move —
          we update this page when they do.
        </p>
      </header>

      <div className="aced-roadmap__timeline">
        {MONTHS.map((month) => (
          <section
            key={month.id}
            id={month.id}
            className="aced-roadmap__month"
            aria-labelledby={`${month.id}-label`}
          >
            <h2 id={`${month.id}-label`}>{month.period}</h2>
            <ul className="aced-roadmap__entries">
              {month.entries.map((entry) => (
                <li key={entry.title}>
                  <div className="aced-roadmap__entry-head">
                    <h3>{entry.title}</h3>
                    {entry.status ? (
                      <span className="aced-roadmap__status">
                        {entry.status}
                      </span>
                    ) : null}
                  </div>
                  <p>{entry.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="aced-roadmap__note">
        Ideas change. Tell us what to prioritise via Feedback in the app, or{' '}
        <Link href="/contact">contact us</Link>.
      </p>
    </article>
  );
}
