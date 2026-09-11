import {redirect} from 'next/navigation';

/** First-login welcome now lives on the dashboard (`/studio`). */
export default function OnboardingPage() {
  redirect('/studio');
}
