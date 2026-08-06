'use client';

import {useState} from 'react';
import {usePathname} from 'next/navigation';
import {
  Dialog,
  DialogHeader,
} from '@astryxdesign/core/Dialog';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {
  FEEDBACK_CATEGORY_LABELS,
  type FeedbackCategory,
} from '@/lib/feedback/types';

type FeedbackWidgetProps = {
  userEmail: string | null;
};

const CATEGORY_ORDER: FeedbackCategory[] = [
  'feature',
  'bug',
  'performance',
  'general',
];

export function FeedbackWidget({userEmail}: FeedbackWidgetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sentBanner, setSentBanner] = useState<string | null>(null);
  const [step, setStep] = useState<'pick' | 'write'>('pick');
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(userEmail ?? '');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setStep('pick');
    setCategory(null);
    setRating(null);
    setMessage('');
    setEmail(userEmail ?? '');
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  function pickCategory(next: FeedbackCategory) {
    setCategory(next);
    setStep('write');
    setError(null);
  }

  async function handleSubmit() {
    if (!category) return;
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          category,
          message,
          rating: rating,
          email: userEmail ? undefined : email,
          page_path: pathname,
          user_agent:
            typeof navigator !== 'undefined' ? navigator.userAgent : null,
          _hp: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not send feedback');

      handleOpenChange(false);
      const note = userEmail
        ? `Thanks! We’ll reply to ${userEmail} if needed.`
        : 'Thanks! We got your note.';
      setSentBanner(note);
      window.setTimeout(() => setSentBanner(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSending(false);
    }
  }

  const categoryMeta = category ? FEEDBACK_CATEGORY_LABELS[category] : null;

  return (
    <>
      {sentBanner ? (
        <p className="aced-feedback-toast" role="status">
          {sentBanner}
        </p>
      ) : null}
      <button
        type="button"
        className="aced-feedback-tab"
        aria-label="Send feedback to ACED-IT"
        onClick={() => setOpen(true)}
      >
        Feedback
      </button>

      <Dialog
        isOpen={open}
        onOpenChange={handleOpenChange}
        width={440}
        maxHeight="90dvh"
        purpose="form"
        className="aced-feedback-dialog"
      >
        <DialogHeader
          title={step === 'pick' ? 'Send us feedback' : categoryMeta?.label ?? 'Feedback'}
          subtitle={
            step === 'pick'
              ? 'Feature ideas, bugs, slow bits. We read every one.'
              : categoryMeta?.hint
          }
          onOpenChange={handleOpenChange}
        />

        {step === 'pick' ? (
          <VStack gap={2} className="aced-feedback-dialog__body">
            <ul className="aced-feedback-categories">
              {CATEGORY_ORDER.map((id) => {
                const meta = FEEDBACK_CATEGORY_LABELS[id];
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className="aced-feedback-categories__item"
                      onClick={() => pickCategory(id)}
                    >
                      <span className="aced-feedback-categories__label">
                        {meta.label}
                      </span>
                      <span className="aced-feedback-categories__hint">
                        {meta.hint}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Text type="supporting" color="secondary" as="p">
              Screenshots help. Paste a link in your message (Loom, Drive, etc.).
            </Text>
          </VStack>
        ) : (
          <VStack gap={3} className="aced-feedback-dialog__body">
            <Button
              label="← Change type"
              variant="secondary"
              clickAction={() => setStep('pick')}
            />

            <Text type="label">How is ACED-IT working for you?</Text>
            <div className="aced-feedback-rating" role="group" aria-label="Satisfaction rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`aced-feedback-rating__btn${rating === value ? ' aced-feedback-rating__btn--on' : ''}`}
                  aria-pressed={rating === value}
                  onClick={() => setRating(rating === value ? null : value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <Text type="supporting" color="secondary" as="p">
              Optional · 1 = frustrated, 5 = love it
            </Text>

            <TextArea
              label="Your feedback"
              value={message}
              onChange={setMessage}
              rows={6}
              placeholder="Feature suggestions, bug reports, or what felt slow…"
              isRequired
            />

            {!userEmail ? (
              <TextInput
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                isRequired
              />
            ) : null}

            {error ? (
              <Text as="p" color="secondary">
                {error}
              </Text>
            ) : null}

            <Button
              label="Send feedback"
              variant="primary"
              isLoading={isSending}
              isDisabled={message.trim().length < 10}
              clickAction={handleSubmit}
            />
          </VStack>
        )}
      </Dialog>
    </>
  );
}
