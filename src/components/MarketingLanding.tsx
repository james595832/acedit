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
  {id: 'why', label: 'How it works'},
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

// Placeholder quotes. Replace with real user feedback before wide launch.
const TESTIMONIALS = [
  {
    quote:
      'I stopped practicing in my head and started saying answers out loud. My real interviews felt easy after that.',
    name: 'Amara',
    role: 'Product Designer',
  },
  {
    quote:
      'The whiteboard timer scared me at first. By my real interview it just felt normal.',
    name: 'Dan',
    role: 'UX Designer',
  },
  {
    quote:
      'My questions came from my actual CV, so I practiced the exact stories interviewers asked about.',
    name: 'Priya',
    role: 'New to design',
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
            href="/roadmap"
          >
            Roadmap
          </Link>
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
          href="/roadmap"
          onClick={closeMenu}
          tabIndex={menuOpen ? 0 : -1}
        >
          Roadmap
        </Link>
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
              Ace your design interview.
            </h1>
            <p className="aced-mkt-hero__lead">
              Practice real questions out loud. Sketch on a timed whiteboard.
              Get a score that shows you what to fix. All of it made just{' '}
              for designers.
            </p>
            <div className="aced-mkt-hero__actions">
              <button
                type="button"
                className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg"
                onClick={() => setPricingOpen(true)}
              >
                Start your 5 free days
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
              £0 today · Then £7.50 a month · Cancel any time
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
            Made for designers chasing their next{'\u00A0'}job.
          </h2>
          <p className="aced-mkt-lead">
            Design interviews ask you to talk about your work, sketch ideas
            live, and stay calm while people watch. That is a skill. Skills{' '}
            get better with{'\u00A0'}practice.
          </p>
          <ul className="aced-mkt-audience">
            <li>
              <strong>Product and UX designers</strong>
              <span>
                Rehearse the questions real interviewers love to ask, before
                the big{'\u00A0'}day.
              </span>
            </li>
            <li>
              <strong>People switching into design</strong>
              <span>
                Learn to tell the story of your work so hiring managers get{' '}
                it{'\u00A0'}fast.
              </span>
            </li>
            <li>
              <strong>Anyone prepping in chaos</strong>
              <span>
                One tidy place to practice, sketch, and improve. No more{' '}
                sticky notes{'\u00A0'}everywhere.
              </span>
            </li>
          </ul>
        </section>

        <section id="why" className="aced-mkt-section aced-mkt-section--tint">
          <p className="aced-mkt-kicker">How it works</p>
          <h2 className="aced-mkt-h2">Practice like it's the real{'\u00A0'}thing.</h2>
          <p className="aced-mkt-lead">
            Four simple steps. No boring theory. Just doing the thing until{' '}it
            feels{'\u00A0'}normal.
          </p>
          <div className="aced-mkt-bento">
            <article className="aced-mkt-bento__card">
              <div
                className="aced-mkt-bento__art aced-mkt-bento__art--cv"
                aria-hidden="true"
              >
                <span className="aced-art-cv">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="aced-art-cv__bubble">
                  Tell me about the checkout flow you redesigned…
                </span>
              </div>
              <h3>Your CV becomes your{'\u00A0'}questions</h3>
              <p>
                Upload your CV and the job ad. We write questions about your
                real projects, not random ones from a{'\u00A0'}list.
              </p>
            </article>

            <article className="aced-mkt-bento__card">
              <div
                className="aced-mkt-bento__art aced-mkt-bento__art--voice"
                aria-hidden="true"
              >
                <span className="aced-art-voice">
                  <span className="aced-art-voice__mic" />
                  <span className="aced-art-voice__bars">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="aced-art-voice__time">0:42</span>
                </span>
              </div>
              <h3>You answer out{'\u00A0'}loud</h3>
              <p>
                Talking is the part everyone fumbles. Practice it out loud,
                exactly like the real{'\u00A0'}day.
              </p>
            </article>

            <article className="aced-mkt-bento__card">
              <div
                className="aced-mkt-bento__art aced-mkt-bento__art--score"
                aria-hidden="true"
              >
                <span className="aced-art-score">
                  <span className="aced-art-score__num">
                    78<small>/100</small>
                  </span>
                  <span className="aced-art-score__row aced-art-score__row--a">
                    <em>Story</em>
                    <i />
                  </span>
                  <span className="aced-art-score__row aced-art-score__row--b">
                    <em>Craft</em>
                    <i />
                  </span>
                  <span className="aced-art-score__row aced-art-score__row--c">
                    <em>Fit</em>
                    <i />
                  </span>
                </span>
              </div>
              <h3>You get a clear{'\u00A0'}score</h3>
              <p>
                Right after you finish, see what was strong and what to{' '}
                fix next{'\u00A0'}time.
              </p>
            </article>

            <article className="aced-mkt-bento__card">
              <div
                className="aced-mkt-bento__art aced-mkt-bento__art--board"
                aria-hidden="true"
              >
                <span className="aced-art-board">
                  <span className="aced-art-board__timer">29:59</span>
                  <i className="aced-art-board__stroke aced-art-board__stroke--a" />
                  <i className="aced-art-board__stroke aced-art-board__stroke--b" />
                  <i className="aced-art-board__stroke aced-art-board__stroke--c" />
                </span>
              </div>
              <h3>You sketch against the{'\u00A0'}clock</h3>
              <p>
                Timed whiteboard challenges. Scary the first time. Easy by{' '}
                the{'\u00A0'}fifth.
              </p>
            </article>
          </div>
        </section>

        <section className="aced-mkt-section">
          <p className="aced-mkt-kicker">Why not the big prep sites?</p>
          <h2 className="aced-mkt-h2">Coder tools vs your design{'\u00A0'}studio</h2>
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
              ['Made for', 'Coders first', 'Designers only'],
              ['Questions about your work', 'Generic lists', 'Built from your CV'],
              ['Practice speaking', 'Sometimes', 'Every session'],
              ['Whiteboard', 'Boxes and arrows', 'Real design prompts'],
              ['Feedback', 'Pass or fail vibes', 'Clear scores and tips'],
              ['Price', 'About $79 a month', '£7.50 a month'],
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
          <h2 className="aced-mkt-h2">Designers who stopped winging{'\u00A0'}it</h2>
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
          <h2 className="aced-mkt-h2">One plan. Five free days.</h2>
          <p className="aced-mkt-lead">
            Try everything free for five days. If it’s not for you, cancel and
            pay nothing. The big coder platforms charge about $79 a month.
            This is £7.50, built only for design.
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
              <li>Five free days · £0 today</li>
              <li>Questions built from your CV</li>
              <li>Speak your answers and get scores</li>
              <li>Timed whiteboard challenges</li>
              <li>Cancel any time in Settings</li>
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
                <strong>Today:</strong> full access, nothing charged
              </li>
              <li>
                <strong>Day 4:</strong> we send a friendly reminder
              </li>
              <li>
                <strong>Day 5:</strong> membership starts at £7.50 or $9.99
              </li>
            </ol>
          </div>
        </section>

        <section className="aced-mkt-cta">
          <h2 className="aced-mkt-h2">Walk in ready. Walk out{'\u00A0'}smiling.</h2>
          <p className="aced-mkt-lead">
            Five free days to practice properly. Keep it only if it{'\u00A0'}helps.
          </p>
          <button
            type="button"
            className="aced-mkt__btn aced-mkt__btn--primary aced-mkt__btn--lg"
            onClick={() => setPricingOpen(true)}
          >
            Start your 5 free days
          </button>
        </section>
      </main>

      <SiteFooter variant="marketing" />

      <PricingTrialDialog isOpen={pricingOpen} onOpenChange={setPricingOpen} />
    </div>
  );
}
