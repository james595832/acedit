import Image from 'next/image';
import Link from 'next/link';

const SUPPORT_EMAIL = 'support@acedit.app';

type SiteFooterProps = {
  variant?: 'marketing' | 'app';
};

/** Shared destinations — same URLs in marketing and app chrome. */
const FOOTER_LINKS = {
  product: [
    {href: '/#who', label: "Who it's for", marketingOnly: true},
    {href: '/#why', label: 'How it works', marketingOnly: true},
    {href: '/#pricing', label: 'Pricing', marketingOnly: true},
    {href: '/roadmap', label: 'Roadmap', marketingOnly: false},
  ],
  company: [
    {href: '/contact', label: 'Contact'},
    {href: `mailto:${SUPPORT_EMAIL}`, label: 'Support', external: true},
  ],
  legal: [
    {href: '/privacy', label: 'Privacy'},
    {href: '/terms', label: 'Terms'},
  ],
} as const;

export function SiteFooter({variant = 'app'}: SiteFooterProps) {
  const year = new Date().getFullYear();

  if (variant === 'marketing') {
    return (
      <footer className="aced-mkt-footer">
        <div className="aced-mkt-footer__top">
          <div className="aced-mkt-footer__brand">
            <Image
              src="/ACED-IT.svg"
              alt=""
              width={96}
              height={18}
              className="aced-mkt__logo-img"
            />
            <p>
              Design interview prep
              <br />
              one place to practise
            </p>
          </div>

          <div className="aced-mkt-footer__cols">
            <nav className="aced-mkt-footer__col" aria-label="Product">
              <p className="aced-mkt-footer__heading">Product</p>
              {FOOTER_LINKS.product.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <nav className="aced-mkt-footer__col" aria-label="Company">
              <p className="aced-mkt-footer__heading">Company</p>
              {FOOTER_LINKS.company.map((link) =>
                'external' in link && link.external ? (
                  <a key={link.href} href={link.href}>
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
            <nav className="aced-mkt-footer__col" aria-label="Legal">
              <p className="aced-mkt-footer__heading">Legal</p>
              {FOOTER_LINKS.legal.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

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
        <Link href="/roadmap">Roadmap</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>
      </nav>
      <p className="aced-app-footer__copy">© {year} ACED-IT</p>
    </footer>
  );
}

export {SUPPORT_EMAIL};
