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

type MarketingLandingProps = {
  userEmail: string | null;
};

const SECTION_LINKS = [
  {id: 'who', label: 'Who it’s for'},
  {id: 'why', label: 'Why join'},
  {id: 'pricing', label: 'Pricing'},
] as const;

export function MarketingLanding({userEmail}: MarketingLandingProps) {
  const [pricingOpen, setPricingOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

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
              Design interview prep that feels like the real room.
            </h1>
            <p className="aced-mkt-hero__lead">
              Upload your CV, speak your answers, and get scored on process,
              craft, and role fit — before the panel does.
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
                <p>Practice interview · Question 2 of 5</p>
              </div>
              <div className="aced-mkt-stage__body">
                <p className="aced-mkt-stage__label">Prompt</p>
                <p className="aced-mkt-stage__q">
                  Walk me through how you’d critique this onboarding flow for a
                  first-time designer role.
                </p>
                <div className="aced-mkt-stage__meter">
                  <span className="aced-mkt-stage__pulse" />
                  <p>Listening · 0:42</p>
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
            Design candidates who want reps that count.
          </h2>
          <p className="aced-mkt-lead">
            Built for product designers, UX designers, and design-adjacent
            candidates preparing for portfolio, craft, and behavioural rounds —
            not generic interview bots.
          </p>
          <ul className="aced-mkt-audience">
            <li>
              <strong>Mid-level &amp; senior designers</strong>
              <span>Sharpen storytelling before a loop that matters.</span>
            </li>
            <li>
              <strong>Career switchers into design</strong>
              <span>Practice the language hiring managers actually use.</span>
            </li>
            <li>
              <strong>Anyone tired of cold practice</strong>
              <span>Questions grounded in your CV and the job you want.</span>
            </li>
          </ul>
        </section>

        <section id="why" className="aced-mkt-section aced-mkt-section--tint">
          <p className="aced-mkt-kicker">Why join</p>
          <h2 className="aced-mkt-h2">
            Personalised practice. Spoken answers. Honest grades.
          </h2>
          <p className="aced-mkt-lead">
            Most candidates either pay a coach they can’t afford weekly, or wing
            it and discover the gaps live. ACED-IT sits in the middle: real
            pressure, clear feedback, on your schedule.
          </p>
          <ol className="aced-mkt-steps">
            <li>
              <span className="aced-mkt-steps__n">01</span>
              <div>
                <h3>Your CV shapes the room</h3>
                <p>
                  Drop your CV and optional JD. Questions track your experience
                  and the role you’re aiming for.
                </p>
              </div>
            </li>
            <li>
              <span className="aced-mkt-steps__n">02</span>
              <div>
                <h3>Answer out loud</h3>
                <p>
                  Speak like you would in a loop. No typing your way out of the
                  hard parts.
                </p>
              </div>
            </li>
            <li>
              <span className="aced-mkt-steps__n">03</span>
              <div>
                <h3>See strong vs weak</h3>
                <p>
                  Grades land on process, craft, and role fit — with criteria you
                  can act on before the next take.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="aced-mkt-section">
          <p className="aced-mkt-kicker">Compared</p>
          <h2 className="aced-mkt-h2">Better than guessing. Cheaper than a coach.</h2>
          <div className="aced-mkt-compare" role="table" aria-label="Value comparison">
            <div className="aced-mkt-compare__row aced-mkt-compare__row--head" role="row">
              <span role="columnheader" />
              <span role="columnheader">Coach</span>
              <span role="columnheader">Cold practice</span>
              <span role="columnheader">ACED-IT</span>
            </div>
            {[
              ['Personalised to your CV', 'Sometimes', 'Rarely', 'Always'],
              ['Voice pressure', 'Yes', 'No', 'Yes'],
              ['Actionable scoring', 'Varies', 'None', 'Every take'],
              ['Typical cost', '£80–150 / hr', 'Free', '£7.50 / mo'],
            ].map(([label, coach, cold, aced]) => (
              <div key={label} className="aced-mkt-compare__row" role="row">
                <span role="rowheader">{label}</span>
                <span role="cell">{coach}</span>
                <span role="cell">{cold}</span>
                <span role="cell" className="aced-mkt-compare__hit">
                  {aced}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="aced-mkt-section aced-mkt-section--pricing">
          <p className="aced-mkt-kicker">Pricing</p>
          <h2 className="aced-mkt-h2">One plan. Five days free.</h2>
          <p className="aced-mkt-lead">
            Try the full studio. If it’s not useful, cancel before day five —
            no charge.
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
              <li>Unlimited personalised practice interviews</li>
              <li>Voice recording + graded feedback</li>
              <li>Cancel anytime in account settings</li>
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
          <h2 className="aced-mkt-h2">Walk into the next loop ready.</h2>
          <p className="aced-mkt-lead">
            Five days to build the muscle. Keep going only if it’s earning its
            keep.
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

      <footer className="aced-mkt-footer">
        <Image
          src="/ACED-IT.svg"
          alt=""
          width={96}
          height={18}
          className="aced-mkt__logo-img"
        />
        <p>Design interview prep · Speak · Score · Improve</p>
      </footer>

      <PricingTrialDialog isOpen={pricingOpen} onOpenChange={setPricingOpen} />
    </div>
  );
}
