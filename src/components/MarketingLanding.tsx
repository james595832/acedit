'use client';

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type MouseEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {PricingTrialDialog} from '@/components/PricingTrialDialog';
import {SiteFooter} from '@/components/SiteFooter';

type MarketingLandingProps = {
  userEmail: string | null;
};

const SECTION_LINKS = [
  {id: 'who', label: 'Who it’s for'},
  {id: 'why', label: 'Why ACED-IT'},
  {id: 'pricing', label: 'Pricing'},
] as const;

const HERO_PROMPTS = [
  {
    kicker: 'Practice interview · Question 2 of 5',
    label: 'Prompt',
    question:
      'Tell me about a project where you improved a messy user flow. What did you change, and how did you know it worked?',
  },
  {
    kicker: 'Practice interview · Question 4 of 5',
    label: 'Prompt',
    question:
      'Walk me through a time you disagreed with a PM on a design decision. How did you resolve it?',
  },
  {
    kicker: 'Whiteboard · 30 min on the clock',
    label: 'Challenge',
    question:
      'Redesign the checkout flow for a grocery app so a weekly shopper can reorder in under a minute.',
  },
] as const;

// Placeholder quotes — replace with real user feedback before wide launch.
const TESTIMONIALS = [
  {
    quote:
      'I stopped rehearsing in my head and started answering out loud. The difference in my real interviews was immediate.',
    name: 'Amara',
    role: 'Product Designer',
  },
  {
    quote:
      'The whiteboard timer is brutal in the best way. My first onsite after practicing here felt familiar instead of terrifying.',
    name: 'Dan',
    role: 'UX Designer',
  },
  {
    quote:
      'Questions generated from my actual CV meant I practiced the stories I’d really be asked about.',
    name: 'Priya',
    role: 'Career switcher → design',
  },
] as const;

export function MarketingLanding({userEmail}: MarketingLandingProps) {
  const [pricingOpen, setPricingOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptVisible, setPromptVisible] = useState(true);
  const [listenSeconds, setListenSeconds] = useState(42);
  const menuId = useId();

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) return;

    const tick = window.setInterval(() => {
      setListenSeconds(s => s + 1);
    }, 1000);

    const rotate = window.setInterval(() => {
      setPromptVisible(false);
      window.setTimeout(() => {
        setPromptIndex(i => (i + 1) % HERO_PROMPTS.length);
        setListenSeconds(8 + Math.floor(Math.random() * 30));
        setPromptVisible(true);
      }, 350);
    }, 7000);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(rotate);
    };
  }, []);

  const heroPrompt = HERO_PROMPTS[promptIndex];
  const listenClock = `${Math.floor(listenSeconds / 60)}:${String(
    listenSeconds % 60,
  ).padStart(2, '0')}`;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const scrollToSection = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      closeMenu();
      const el = document.getElementById(id);
      if (!el) return;

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Defer scroll until drawer close paint so sticky header offset is stable
      requestAnimationFrame(() => {
        el.scrollIntoView({
          behavior: prefersReduced ? 'auto' : 'smooth',
          block: 'start',
        });
        window.history.replaceState(null, '', `#${id}`);
      });
    },
    [closeMenu],
  );

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (mq.matches) closeMenu();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [closeMenu]);

  const accountHref = userEmail ? '/studio' : '/login';
  const accountLabel = userEmail ? 'Studio' : 'Sign in';

  return (
    <div className="aced-mkt">
      <header className="aced-mkt__nav">
        <Link href="/" className="aced-mkt__logo" aria-label="ACED-IT home">
          <Image
            src="/ACED-IT.svg"
            alt="ACED-IT"
            width={128}
            height={24}
            className="aced-mkt__logo-img"
            priority
          />
        </Link>

        <nav className="aced-mkt__nav-end" aria-label="Landing">
          {SECTION_LINKS.map(({id, label}) => (
            <a
              key={id}
              className="aced-mkt__nav-link aced-mkt__nav-link--desktop"
              href={`#${id}`}
              onClick={event => scrollToSection(event, id)}
            >
              {label}
            </a>
          ))}
          <Link
            className="aced-mkt__nav-link aced-mkt__nav-link--desktop"
            href={accountHref}
          >
            {accountLabel}
          </Link>
          <button
            type="button"
            className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--nav-cta"
            onClick={() => setPricingOpen(true)}
          >
            Start free trial
          </button>
          <button
            type="button"
            className={`aced-mkt__burger${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen(open => !open)}
          >
            <span className="aced-mkt__burger-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </nav>
      </header>

      <div
        className={`aced-mkt__drawer-backdrop${menuOpen ? ' is-open' : ''}`}
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <nav
        id={menuId}
        className={`aced-mkt__drawer${menuOpen ? ' is-open' : ''}`}
        aria-label="Mobile"
        aria-hidden={!menuOpen}
      >
        <p className="aced-mkt__drawer-kicker">Menu</p>
        {SECTION_LINKS.map(({id, label}) => (
          <a
            key={id}
            className="aced-mkt__drawer-link"
            href={`#${id}`}
            onClick={event => scrollToSection(event, id)}
            tabIndex={menuOpen ? 0 : -1}
          >
            {label}
          </a>
        ))}
        <Link
          className="aced-mkt__drawer-link"
          href={accountHref}
          onClick={closeMenu}
          tabIndex={menuOpen ? 0 : -1}
        >
          {accountLabel}
        </Link>
        <button
          type="button"
          className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg aced-mkt__btn--block"
          onClick={() => {
            closeMenu();
            setPricingOpen(true);
          }}
          tabIndex={menuOpen ? 0 : -1}
        >
          Start free trial
        </button>
      </nav>

      <main>
        <section className="aced-mkt-hero" aria-labelledby="aced-hero-brand">
          <div className="aced-mkt-hero__copy">
            <p id="aced-hero-brand" className="aced-mkt-hero__brand">
              ACED-IT
            </p>
            <h1 className="aced-mkt-hero__title">
              Interview practice built for designers.
            </h1>
            <p className="aced-mkt-hero__lead">
              Most prep tools are built for engineers. This one speaks design —
              portfolio stories, critique, whiteboard challenges. Practice out
              loud, get clear feedback, walk in ready.
            </p>
            <div className="aced-mkt-hero__actions">
              <button
                type="button"
                className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg"
                onClick={() => setPricingOpen(true)}
              >
                Start 5-day free trial
              </button>
              <a
                className="aced-mkt__btn aced-mkt__btn--ghost aced-mkt__btn--lg"
                href="#pricing"
                onClick={event => scrollToSection(event, 'pricing')}
              >
                See pricing
              </a>
            </div>
            <p className="aced-mkt-hero__note">
              £0 today · Then £7.50 / mo · Cancel anytime
            </p>
          </div>

          <div className="aced-mkt-hero__visual" aria-hidden="true">
            <div className="aced-mkt-stage">
              <div className="aced-mkt-stage__chrome">
                <span />
                <span />
                <span />
                <p>{heroPrompt.kicker}</p>
              </div>
              <div
                className={`aced-mkt-stage__body${
                  promptVisible ? '' : ' is-swapping'
                }`}
              >
                <p className="aced-mkt-stage__label">{heroPrompt.label}</p>
                <p className="aced-mkt-stage__q">{heroPrompt.question}</p>
                <div className="aced-mkt-stage__meter">
                  <span className="aced-mkt-stage__pulse" />
                  <p>Listening · {listenClock}</p>
                </div>
                <div className="aced-mkt-stage__scores">
                  <span>Process</span>
                  <span>Craft</span>
                  <span>Role fit</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="who" className="aced-mkt-section">
          <p className="aced-mkt-kicker">Who it’s for</p>
          <h2 className="aced-mkt-h2">
            Designers getting ready for interviews.
          </h2>
          <p className="aced-mkt-lead">
            If you’re applying for product or UX roles and want proper practice
            — not a LeetCode grinder with a design tab bolted on — this is for
            you.
          </p>
          <ul className="aced-mkt-audience">
            <li>
              <strong>Product &amp; UX designers</strong>
              <span>
                Practice portfolio, process, and behavioural questions before
                the real panel.
              </span>
            </li>
            <li>
              <strong>People switching into design</strong>
              <span>
                Learn how to talk about your work the way hiring managers
                expect.
              </span>
            </li>
            <li>
              <strong>Anyone who’s been “prepping” in chaos</strong>
              <span>
                One place for practice, whiteboards, and feedback — not
                scattered notes.
              </span>
            </li>
          </ul>
        </section>

        <section id="why" className="aced-mkt-section aced-mkt-section--tint">
          <p className="aced-mkt-kicker">Why ACED-IT</p>
          <h2 className="aced-mkt-h2">
            Design interviews aren’t engineering interviews.
          </h2>
          <p className="aced-mkt-lead">
            The big prep platforms were built for engineers — algorithm drills
            and system design, with design as an afterthought. But your
            interview is portfolio stories, critique, process, and a marker in
            your hand. ACED-IT practices exactly that — so you’re not winging
            it with tools made for someone else’s job.
          </p>
          <ol className="aced-mkt-steps">
            <li>
              <span className="aced-mkt-steps__n">01</span>
              <div>
                <h3>Questions from your CV</h3>
                <p>
                  Upload your CV and optional job description. Practice
                  questions match your experience and the role you want.
                </p>
              </div>
            </li>
            <li>
              <span className="aced-mkt-steps__n">02</span>
              <div>
                <h3>Speak your answers</h3>
                <p>
                  Answer out loud, like you will on the day. Typing in a doc
                  doesn’t train that muscle.
                </p>
              </div>
            </li>
            <li>
              <span className="aced-mkt-steps__n">03</span>
              <div>
                <h3>Get clear feedback</h3>
                <p>
                  See what’s strong, what’s weak, and what to fix next —
                  process, craft, and role fit.
                </p>
              </div>
            </li>
            <li>
              <span className="aced-mkt-steps__n">04</span>
              <div>
                <h3>Whiteboard when you need it</h3>
                <p>
                  Timed challenges with a marker board and clarifying
                  questions — same room energy, less guesswork.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="aced-mkt-section">
          <p className="aced-mkt-kicker">Why not the big prep platforms?</p>
          <h2 className="aced-mkt-h2">Engineering tools vs a design studio</h2>
          <div
            className="aced-mkt-compare"
            role="table"
            aria-label="Generic prep tools compared with ACED-IT"
          >
            <div
              className="aced-mkt-compare__row aced-mkt-compare__row--head"
              role="row"
            >
              <span role="columnheader" />
              <span role="columnheader">Generic prep tools</span>
              <span role="columnheader">ACED-IT</span>
            </div>
            {[
              ['Built for', 'Engineers first', 'Designers only'],
              ['Questions from your CV', 'Generic question banks', 'Automatic'],
              ['Practice out loud', 'Sometimes', 'Built in'],
              [
                'Whiteboard challenges',
                'System design diagrams',
                'Design prompts + marker canvas',
              ],
              ['Feedback after each take', 'Pass/fail vibes', 'Clear scores'],
              ['Price', '$79/mo territory', '£7.50/mo'],
            ].map(([label, diy, aced]) => (
              <div key={label} className="aced-mkt-compare__row" role="row">
                <span role="rowheader">{label}</span>
                <span role="cell">{diy}</span>
                <span role="cell" className="aced-mkt-compare__hit">
                  {aced}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="aced-mkt-section aced-mkt-section--tint">
          <p className="aced-mkt-kicker">From practice rooms</p>
          <h2 className="aced-mkt-h2">Designers who stopped winging it</h2>
          <ul className="aced-mkt-quotes">
            {TESTIMONIALS.map(({quote, name, role}) => (
              <li key={name} className="aced-mkt-quotes__item">
                <p className="aced-mkt-quotes__text">“{quote}”</p>
                <p className="aced-mkt-quotes__who">
                  <strong>{name}</strong>
                  <span>{role}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section id="pricing" className="aced-mkt-section aced-mkt-section--pricing">
          <p className="aced-mkt-kicker">Pricing</p>
          <h2 className="aced-mkt-h2">Simple plan. Five days free.</h2>
          <p className="aced-mkt-lead">
            Try the full practice studio. Cancel before day five if it’s not
            for you — you won’t be charged. Engineering-first platforms charge
            $79 a month; this is a fraction of that, built only for design.
          </p>

          <div className="aced-mkt-plan">
            <div className="aced-mkt-plan__top">
              <p className="aced-mkt-plan__name">Pro membership</p>
              <p className="aced-mkt-plan__price">
                <span>£7.50</span>
                <small>/ month</small>
              </p>
              <p className="aced-mkt-plan__alt">or $9.99 / month after trial</p>
            </div>
            <ul className="aced-mkt-plan__list">
              <li>5-day free trial · £0 today</li>
              <li>Practice interviews from your CV</li>
              <li>Voice answers + clear feedback</li>
              <li>Design whiteboard challenges</li>
              <li>Cancel anytime in Settings</li>
            </ul>
            <button
              type="button"
              className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg aced-mkt__btn--block"
              onClick={() => setPricingOpen(true)}
            >
              Start free trial
            </button>
            <ol className="aced-mkt-plan__timeline">
              <li>
                <strong>Today</strong> — Full access, nothing charged
              </li>
              <li>
                <strong>Day 4</strong> — Reminder email
              </li>
              <li>
                <strong>Day 5</strong> — Membership starts at £7.50 / $9.99
              </li>
            </ol>
          </div>
        </section>

        <section className="aced-mkt-cta">
          <h2 className="aced-mkt-h2">
            Made for designers. Priced for job seekers.
          </h2>
          <p className="aced-mkt-lead">
            Five free days to prep properly — then keep it only if it helps.
          </p>
          <button
            type="button"
            className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg"
            onClick={() => setPricingOpen(true)}
          >
            Start 5-day free trial
          </button>
        </section>
      </main>

      <SiteFooter variant="marketing" />

      <PricingTrialDialog isOpen={pricingOpen} onOpenChange={setPricingOpen} />
    </div>
  );
}
