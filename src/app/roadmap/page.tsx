import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Roadmap | ACED-IT',
  description:
    'What we have shipped, what is next, and where ACED-IT is headed: practice, leaderboards, hiring partners, and a better path than LinkedIn spam.',
};

type RoadmapItem = {
  title: string;
  body: string;
  tag?: string;
};

type RoadmapPhase = {
  id: string;
  label: string;
  title: string;
  lead: string;
  status: 'live' | 'next' | 'building' | 'later';
  items: RoadmapItem[];
};

const PHASES: RoadmapPhase[] = [
  {
    id: 'now',
    label: 'Now',
    title: 'Live today',
    lead: 'The core loop you can use right now.',
    status: 'live',
    items: [
      {
        title: 'Practice interviews',
        body: 'Upload your CV and a job ad. Answer out loud. Get a score and clear notes on what to fix.',
        tag: 'Live',
      },
      {
        title: 'Whiteboard challenges',
        body: 'Timed prompts, a marker board, and clarifying questions. Practice like an onsite.',
        tag: 'Live',
      },
      {
        title: 'Portfolio review',
        body: 'Check whether your case studies tell a story a hiring manager can follow.',
        tag: 'Live',
      },
      {
        title: 'Results and feedback',
        body: 'See how you scored, revisit answers, and tell us what to improve in the product.',
        tag: 'Live',
      },
    ],
  },
  {
    id: 'next',
    label: 'Next',
    title: 'Climb the board',
    lead: 'Make practice sticky. Give people a reason to come back and get sharper.',
    status: 'next',
    items: [
      {
        title: 'Leaderboard',
        body: 'Keep practising to climb. See how you compare, track streaks, and push for a higher score over time. Not a vanity list. A reason to improve every week.',
        tag: 'Planned',
      },
    ],
  },
  {
    id: 'building',
    label: 'Building',
    title: 'Hiring that finds you',
    lead: 'When you are ready, companies come to strong candidates. Not the other way round.',
    status: 'building',
    items: [
      {
        title: 'Company partners',
        body: 'Work with employers who want a real pipeline of design talent. Banks, product companies, and teams tired of 100 LinkedIn applications where 90 are a bad fit.',
        tag: 'Partners',
      },
      {
        title: 'Score opens doors',
        body: 'High practice scores and hire-ready signals can unlock a small set of interview intros. Proof first. Then introductions.',
        tag: 'Matching',
      },
      {
        title: 'Retainer pipeline for employers',
        body: 'Companies pay for a steady flow of candidates who already match the role. A real revenue line for ACED-IT, and a fairer path for designers than spray-and-pray applications.',
        tag: 'Revenue',
      },
    ],
  },
  {
    id: 'later',
    label: 'Later',
    title: 'A better network for design careers',
    lead: 'People stay on LinkedIn because there is nowhere else. We want somewhere else.',
    status: 'later',
    items: [
      {
        title: 'Smarter AI for designers and hiring',
        body: 'Models that understand design work, interview craft, and what recruiters actually need. Better matches. Less noise. Feedback that gets more useful the more you practise.',
        tag: 'AI',
      },
      {
        title: 'The LinkedIn breaker',
        body: 'A place built for showing you are ready, not for posting. Practice, proof, and introductions in one product people choose because it works.',
        tag: 'Vision',
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <article className="aced-roadmap">
      <header className="aced-masthead">
        <div className="aced-masthead__copy">
          <h1>Where ACED-IT is going</h1>
          <p className="aced-masthead__lead">
            Practice first. Then proof. Then real opportunities. Here is what is
            live, what is next, and the bigger bet we are building toward.
          </p>
        </div>
      </header>

      <nav className="aced-roadmap__tabs" aria-label="Roadmap phases">
        {PHASES.map((phase) => (
          <a key={phase.id} href={`#${phase.id}`} className="aced-roadmap__tab">
            <span className={`aced-roadmap__dot aced-roadmap__dot--${phase.status}`} />
            {phase.label}
          </a>
        ))}
      </nav>

      <div className="aced-roadmap__board">
        {PHASES.map((phase) => (
          <section
            key={phase.id}
            id={phase.id}
            className="aced-roadmap__column"
            aria-labelledby={`${phase.id}-title`}
          >
            <header className="aced-roadmap__column-head">
              <p className={`aced-roadmap__status aced-roadmap__status--${phase.status}`}>
                {phase.label}
              </p>
              <h2 id={`${phase.id}-title`}>{phase.title}</h2>
              <p>{phase.lead}</p>
            </header>
            <ul className="aced-roadmap__list">
              {phase.items.map((item) => (
                <li key={item.title} className="aced-roadmap__card">
                  {item.tag ? (
                    <span className="aced-roadmap__tag">{item.tag}</span>
                  ) : null}
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="aced-roadmap__why" aria-labelledby="roadmap-why">
        <h2 id="roadmap-why">Why this order</h2>
        <p>
          Designers need a place to get good before they apply. Companies need
          people who can already show they are ready. LinkedIn gives neither
          side that signal. ACED-IT starts with practice you can trust, then
          turns strong scores into introductions employers will pay for.
        </p>
        <p>
          Ideas change. If something here shifts, we will update this page. Want
          a say? Use Feedback in the app, or{' '}
          <Link href="/contact">contact us</Link>.
        </p>
      </section>
    </article>
  );
}
