import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Hide the bottom-left Next.js route/dev badge in development
  devIndicators: false,
  // pdf-parse / unpdf need their pdf.js workers unbundled on Vercel.
  serverExternalPackages: ['pdf-parse', 'unpdf', 'pdfjs-dist'],
};

export default nextConfig;
