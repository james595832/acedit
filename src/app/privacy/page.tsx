import type {Metadata} from 'next';
import {LegalPage, LegalSection} from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — ACED-IT',
  description:
    'How ACED-IT collects, uses, and protects your personal data when you use acedit.app.',
};

const LAST_UPDATED = '1 August 2026';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      kicker="Legal · Privacy"
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection id="intro" title="1. Introduction">
        <p>
          This Privacy Policy explains how <strong>ACED-IT</strong> (“we”, “us”,
          “our”) collects, uses, stores, and shares personal data when you visit{' '}
          <a href="https://acedit.app">acedit.app</a> or use our design interview
          preparation service (the “Service”).
        </p>
        <p>
          We are the data controller for personal data processed through the
          Service. If you have questions or want to exercise your rights, contact
          us at{' '}
          <a href="mailto:support@acedit.app">support@acedit.app</a>.
        </p>
        <p>
          This policy is written for users in the United Kingdom and European
          Economic Area. If you access the Service from elsewhere, local laws may
          also apply.
        </p>
      </LegalSection>

      <LegalSection id="data-we-collect" title="2. Personal data we collect">
        <p>We may collect the following categories of personal data:</p>
        <ul>
          <li>
            <strong>Account data</strong> — name, email address, password
            (stored in hashed form by our authentication provider), and optional
            marketing preferences.
          </li>
          <li>
            <strong>Profile &amp; billing data</strong> — subscription status,
            trial dates, Stripe customer identifiers, and invoice metadata. We do
            not store full payment card numbers; card details are handled by
            Stripe.
          </li>
          <li>
            <strong>CV &amp; job description content</strong> — files and text
            you upload so we can generate practice questions and tailor feedback
            to your experience and target role.
          </li>
          <li>
            <strong>Practice session data</strong> — interview questions,
            voice recordings, transcripts, scores, feedback, session timestamps,
            and related metadata.
          </li>
          <li>
            <strong>Whiteboard data</strong> — sketches, post-it notes, talk-track
            text, clarifying chat with the AI interviewer, debrief scores, and
            saved board images.
          </li>
          <li>
            <strong>Technical &amp; usage data</strong> — IP address, browser
            type, device information, pages viewed, and diagnostic logs needed
            to operate and secure the Service.
          </li>
          <li>
            <strong>Communications</strong> — messages you send to{' '}
            <a href="mailto:support@acedit.app">support@acedit.app</a> and
            essential service emails (account verification, billing, security).
          </li>
        </ul>
        <p>
          You choose what to upload. Do not submit sensitive personal data (e.g.
          health information, national ID numbers, or third-party confidential
          information) unless you are comfortable it being processed for practice
          purposes.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How and why we use your data">
        <p>We use personal data to:</p>
        <ul>
          <li>create and manage your account;</li>
          <li>provide practice interviews, whiteboard challenges, and feedback;</li>
          <li>process subscriptions, trials, and payments;</li>
          <li>send service, billing, and security communications;</li>
          <li>send marketing emails only where you have opted in;</li>
          <li>improve, secure, and troubleshoot the Service;</li>
          <li>comply with legal obligations and enforce our Terms.</li>
        </ul>
        <p>
          Under UK GDPR, our lawful bases typically include:{' '}
          <strong>contract</strong> (to deliver the Service you signed up for),{' '}
          <strong>legitimate interests</strong> (security, analytics, product
          improvement — balanced against your rights),{' '}
          <strong>consent</strong> (optional marketing), and{' '}
          <strong>legal obligation</strong> (tax and accounting records).
        </p>
      </LegalSection>

      <LegalSection id="ai" title="4. AI and automated processing">
        <p>
          Parts of the Service use artificial intelligence to analyse CVs, generate
          questions, transcribe or interpret answers, score responses, and run
          whiteboard debriefs. Your content may be sent to AI providers for this
          purpose.
        </p>
        <p>
          Automated feedback is for <strong>practice only</strong>. It is not a
          human hiring decision and does not guarantee interview outcomes. You may
          contact us if you want a human review of a decision that significantly
          affects you.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="5. Who we share data with">
        <p>
          We do not sell your personal data. We share data only with trusted
          processors that help us run the Service, including:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — authentication and profile storage;
          </li>
          <li>
            <strong>Stripe</strong> — payments, subscriptions, and invoicing;
          </li>
          <li>
            <strong>Anthropic</strong> — AI analysis, question generation, grading,
            and whiteboard chat/debrief;
          </li>
          <li>
            <strong>Deepgram</strong> (where enabled) — speech-to-text for voice
            answers;
          </li>
          <li>
            <strong>Vercel</strong> (or equivalent hosting) — application hosting
            and delivery;
          </li>
          <li>
            <strong>Email providers</strong> — transactional and, if opted in,
            marketing messages.
          </li>
        </ul>
        <p>
          Each processor is bound by contract to protect your data and use it only
          on our instructions. We may also disclose data if required by law, court
          order, or to protect rights, safety, and security.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="6. International transfers">
        <p>
          Some providers may process data outside the UK/EEA (for example, in the
          United States). Where this happens, we rely on appropriate safeguards such
          as UK International Data Transfer Agreements, EU Standard Contractual
          Clauses, or equivalent mechanisms approved under applicable law.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="7. How long we keep data">
        <ul>
          <li>
            <strong>Account &amp; billing records</strong> — for as long as your
            account is active and for up to seven years thereafter where needed
            for tax, accounting, or legal claims.
          </li>
          <li>
            <strong>Practice content</strong> — until you delete it, delete your
            account, or ask us to erase it, subject to backup cycles (typically up
            to 30 days).
          </li>
          <li>
            <strong>Marketing preferences</strong> — until you withdraw consent or
            we no longer use the list.
          </li>
          <li>
            <strong>Support emails</strong> — as long as needed to resolve your
            request and maintain a reasonable support history.
          </li>
        </ul>
        <p>
          When data is no longer needed, we delete or anonymise it using
          commercially reasonable measures.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. Security">
        <p>
          We use technical and organisational measures appropriate to the risk,
          including encryption in transit (HTTPS), access controls, and
          authenticated APIs. No online service is completely secure; please use a
          strong, unique password and keep it confidential.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="9. Your rights">
        <p>
          Depending on where you live, you may have the right to access, rectify,
          erase, restrict, or port your personal data, and to object to certain
          processing. Where we rely on consent, you may withdraw it at any time
          without affecting prior lawful processing.
        </p>
        <p>
          To exercise your rights, email{' '}
          <a href="mailto:support@acedit.app">support@acedit.app</a>. We may need
          to verify your identity. You can also delete your account in Settings,
          which removes your authentication profile and cancels active
          subscriptions where applicable.
        </p>
        <p>
          UK users may complain to the Information Commissioner&apos;s Office (
          <a href="https://ico.org.uk">ico.org.uk</a>). EEA users may contact
          their local supervisory authority.
        </p>
      </LegalSection>

      <LegalSection id="marketing" title="10. Marketing communications">
        <p>
          We send essential service emails (verification, billing, security)
          regardless of marketing preference. Promotional emails are sent only if
          you opt in at signup or later. Every marketing email includes an
          unsubscribe link, or you can email{' '}
          <a href="mailto:support@acedit.app">support@acedit.app</a>.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="11. Cookies and similar technologies">
        <p>
          We use strictly necessary cookies and local storage to keep you signed
          in, remember preferences, and protect the Service. We do not use
          third-party advertising cookies on acedit.app at the time of this policy.
        </p>
        <p>
          You can control cookies through your browser settings. Blocking essential
          cookies may prevent parts of the Service from working.
        </p>
      </LegalSection>

      <LegalSection id="children" title="12. Children">
        <p>
          The Service is intended for adults preparing for professional roles. It
          is not directed at children under 16, and we do not knowingly collect
          their personal data. Contact us if you believe a child has provided data
          and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the
          new version on acedit.app and update the “Last updated” date. Material
          changes may be notified by email or in-app notice where appropriate.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact">
        <p>
          Data protection enquiries:{' '}
          <a href="mailto:support@acedit.app">support@acedit.app</a>
        </p>
        <p>
          Website: <a href="https://acedit.app">https://acedit.app</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
