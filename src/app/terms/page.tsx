import type {Metadata} from 'next';
import {LegalPage, LegalSection} from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms & Conditions | ACED-IT',
  description:
    'Terms and conditions for using ACED-IT design interview prep at acedit.app.',
};

const LAST_UPDATED = '1 August 2026';

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" lastUpdated={LAST_UPDATED}>
      <LegalSection id="agreement" title="1. Agreement to these terms">
        <p>
          These Terms &amp; Conditions (“Terms”) govern your access to and use of
          the ACED-IT website and service at{' '}
          <a href="https://acedit.app">acedit.app</a> (the “Service”), operated
          by ACED-IT (“we”, “us”, “our”).
        </p>
        <p>
          By creating an account, starting a trial, or using the Service, you
          agree to these Terms and our{' '}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use
          the Service.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Who may use the Service">
        <p>
          You must be at least 16 years old and able to enter a binding contract.
          You may use the Service for personal interview preparation only, not on
          behalf of an organisation unless you have authority to bind that
          organisation to these Terms.
        </p>
      </LegalSection>

      <LegalSection id="account" title="3. Your account">
        <ul>
          <li>
            You must provide accurate registration information and keep your login
            credentials secure.
          </li>
          <li>
            You are responsible for all activity under your account.
          </li>
          <li>
            Notify us immediately at{' '}
            <a href="mailto:support@acedit.app">support@acedit.app</a> if you
            suspect unauthorised access.
          </li>
          <li>
            You may delete your account at any time in Settings. Deletion cancels
            active subscriptions where applicable and removes your authentication
            profile as described in our Privacy Policy.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="service" title="4. The Service">
        <p>
          ACED-IT provides tools to practise design interviews, including CV-based
          question generation, voice practice, automated feedback, whiteboard
          challenges, and session review. Features may change as we improve the
          product.
        </p>
        <p>
          The Service is provided for <strong>practice and learning</strong>. It
          does not guarantee employment, interview invitations, or specific scores
          in real interviews.
        </p>
      </LegalSection>

      <LegalSection id="trial-billing" title="5. Free trial, subscription &amp; billing">
        <ul>
          <li>
            <strong>Free trial:</strong> New Pro memberships may include a
            5-day free trial with full access. You will not be charged during the
            trial if you cancel before it ends.
          </li>
          <li>
            <strong>After trial:</strong> Unless cancelled, your subscription
            renews automatically at the price shown at checkout (currently £7.50
            per month GBP or $9.99 per month USD, or equivalent as processed by
            Stripe).
          </li>
          <li>
            <strong>Payment:</strong> Payments are processed by Stripe. By
            subscribing, you authorise recurring charges to your payment method.
          </li>
          <li>
            <strong>Reminder:</strong> We may email you before your trial ends
            (for example on day four) so you can cancel if you do not wish to
            continue.
          </li>
          <li>
            <strong>Taxes:</strong> Prices may exclude VAT or other taxes where
            applicable; Stripe will show the final amount at checkout.
          </li>
          <li>
            <strong>Manage billing:</strong> Update payment details, view
            invoices, or cancel in Settings or via the Stripe customer portal.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="cancellation" title="6. Cancellation &amp; refunds">
        <p>
          You may cancel at any time. Cancellation stops future billing; access
          continues until the end of the current paid period or trial, unless
          stated otherwise at checkout.
        </p>
        <p>
          Except where required by applicable consumer law, fees already paid are
          non-refundable, including if you do not use the Service during a billing
          period. If you believe you were charged in error, contact{' '}
          <a href="mailto:support@acedit.app">support@acedit.app</a> within 14
          days.
        </p>
        <p>
          Nothing in these Terms limits your statutory rights as a consumer in the
          United Kingdom or European Union.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="7. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>use the Service unlawfully or to harm others;</li>
          <li>
            upload content you do not have the right to use, or that infringes
            confidentiality, copyright, or privacy;
          </li>
          <li>
            attempt to reverse engineer, scrape, overload, or circumvent security
            or usage limits;
          </li>
          <li>
            share account access or resell the Service without our written
            permission;
          </li>
          <li>
            use automated scripts to interact with the Service except via
            documented APIs we provide;
          </li>
          <li>
            misuse AI features to generate spam, harassment, or unrelated content.
          </li>
        </ul>
        <p>
          We may suspend or terminate access if you breach these Terms or if we
          reasonably believe your use poses risk to the Service or others.
        </p>
      </LegalSection>

      <LegalSection id="your-content" title="8. Your content">
        <p>
          You retain ownership of CVs, recordings, sketches, and other content
          you submit (“Your Content”). You grant us a limited licence to host,
          process, and display Your Content solely to operate and improve the
          Service, including sharing with subprocessors listed in our Privacy
          Policy (e.g. AI providers for grading).
        </p>
        <p>
          You represent that you have the rights needed to upload Your Content and
          that it does not violate third-party rights or applicable law.
        </p>
      </LegalSection>

      <LegalSection id="ai-disclaimer" title="9. AI feedback disclaimer">
        <p>
          Scores, transcripts, debriefs, and interviewer responses may be
          generated or assisted by artificial intelligence. They may contain
          errors, omissions, or subjective judgments. You should not rely on them
          as professional career, legal, or hiring advice.
        </p>
        <p>
          You remain responsible for what you say in real interviews and for
          verifying any feedback before acting on it.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="10. Our intellectual property">
        <p>
          The ACED-IT name, branding, website, software, challenge library, and
          documentation are owned by us or our licensors. These Terms do not grant
          you any rights to our intellectual property except the limited right to
          use the Service as intended.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" title="11. Third-party services">
        <p>
          The Service integrates with third parties (e.g. Supabase, Stripe,
          Anthropic). Your use of those services may be subject to their terms.
          We are not responsible for third-party websites or services linked from
          the Service.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="12. Availability &amp; changes">
        <p>
          We aim to keep the Service available but do not guarantee uninterrupted
          access. Maintenance, updates, or events outside our control may cause
          downtime.
        </p>
        <p>
          We may modify, suspend, or discontinue features with reasonable notice
          where practicable. Material adverse changes to paid features will be
          communicated in advance where required by law.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="13. Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for indirect,
          incidental, special, consequential, or punitive damages, or for loss of
          profits, data, goodwill, or interview outcomes arising from your use of
          the Service.
        </p>
        <p>
          Our total liability for any claim relating to the Service is limited to
          the greater of (a) the amount you paid us in the twelve months before
          the claim, or (b) £50, except where liability cannot be limited under
          applicable law (including death or personal injury caused by negligence,
          or fraud).
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="14. Indemnity">
        <p>
          You agree to indemnify and hold us harmless from claims, damages, and
          costs arising from Your Content, your breach of these Terms, or your
          misuse of the Service, except to the extent caused by our negligence or
          wilful misconduct.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="15. Termination">
        <p>
          You may stop using the Service at any time. We may terminate or suspend
          your access for breach of these Terms, non-payment, or if we discontinue
          the Service. Sections that by nature should survive (including payment
          obligations accrued, liability limits, and governing law) will survive
          termination.
        </p>
      </LegalSection>

      <LegalSection id="privacy" title="16. Privacy">
        <p>
          Our{' '}
          <a href="/privacy">Privacy Policy</a> explains how we handle personal
          data. It forms part of your agreement with us.
        </p>
      </LegalSection>

      <LegalSection id="law" title="17. Governing law &amp; disputes">
        <p>
          These Terms are governed by the laws of England and Wales. Courts in
          England and Wales have exclusive jurisdiction, except that if you are a
          consumer resident in Scotland or Northern Ireland you may bring
          proceedings in your local courts, and mandatory consumer protections in
          your country of residence still apply.
        </p>
        <p>
          Before formal proceedings, please contact{' '}
          <a href="mailto:support@acedit.app">support@acedit.app</a> so we can try
          to resolve the issue informally.
        </p>
      </LegalSection>

      <LegalSection id="general" title="18. General">
        <ul>
          <li>
            If any provision is unenforceable, the rest remains in effect.
          </li>
          <li>
            Our failure to enforce a right is not a waiver.
          </li>
          <li>
            You may not assign these Terms without our consent; we may assign them
            in connection with a merger or sale.
          </li>
          <li>
            These Terms and the Privacy Policy are the entire agreement between
            you and us regarding the Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="contact" title="19. Contact">
        <p>
          <a href="mailto:support@acedit.app">support@acedit.app</a>
        </p>
        <p>
          <a href="https://acedit.app">https://acedit.app</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
