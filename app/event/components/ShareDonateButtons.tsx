import ShareDonateClient from './ShareDonateClient';

interface ShareDonateButtonsProps {
  eventId: string;
  headline: string;
  upiId: string;
  upiName: string;
  upiNote: string;
  baseUrl: string;
}

// Server Component - Cached at build time, never revalidates
export default async function ShareDonateButtons(props: ShareDonateButtonsProps) {
  // This component is cached at build time and never revalidates
  return <ShareDonateClient {...props} />;
}

// Add this to force static rendering and caching
export const dynamic = 'force-static';
export const revalidate = false;