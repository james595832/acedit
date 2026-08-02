import Image from 'next/image';
import Link from 'next/link';

const SUPPORT_EMAIL = 'support@acedit.app';

type SiteFooterProps = {
  variant?: 'marketing' | 'app';
};

export function SiteFooter({variant = 'app'}: SiteFooterProps) {
  const year = new Date().getFullYear();

  if (variant === 'marketing') {
    return (
      <footer className="aced-mkt-footer">
        <div className="aced-mkt-footer__brand">
          <Image
            src="/ACED-IT.svg"
            alt=""
            width={96}
            height={18}
            className="aced-mkt__logo-img"
          />
          <p>Design interview prep · one place to practice</p>
        </div>
        <nav className="aced-mkt-footer__links" aria-label="Footer">
          <Link href="/#who">Who it&apos;s for</Link>
          <Link href="/#why">Why ACED-IT</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/contact">Contact</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </nav>
        <p className="aced-mkt-footer__legal">
          © {year} ACED-IT ·{' '}
          <a href="https://acedit.app">acedit.app</a>
        </p>
      </footer>
    );
  }

  return (
    <footer className="aced-app-footer" aria-label="Site footer">
      <nav className="aced-app-footer__links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </nav>
      <p className="aced-app-footer__copy">© {year} ACED-IT</p>
    </footer>
  );
}

export {SUPPORT_EMAIL};
