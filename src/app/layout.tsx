import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { BrandingManager } from '@/components/branding-manager';
import { Public_Sans } from 'next/font/google';

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-public-sans',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

  export async function generateMetadata(): Promise<Metadata> {
    const envId = process.env.NEXT_PUBLIC_DB_ID || process.env.NEXT_PUBLIC_DB_SLUG || "FYQRMChCqPb64iM5hFvVlr2omyu2";
    const envLogoUrl = process.env.NEXT_PUBLIC_LOGO_URL || '';
    const envInstituteName = process.env.NEXT_PUBLIC_INSTITUTE_NAME || '';
    
    let title = process.env.NEXT_PUBLIC_SEO_TITLE || envInstituteName || 'Aspire Education';
    let description = process.env.NEXT_PUBLIC_SEO_DESCRIPTION || 'Professional Management For Educational Institutes';
    let faviconUrl = envLogoUrl || 'https://ik.imagekit.io/gnzjd77mb/WhatsApp%20Image%202026-04-04%20at%2015.05.20.jpeg';

    if (envId) {
      try {
        const res = await fetch(`https://tb-ims-default-rtdb.firebaseio.com/Institutes/${envId}/profile.json`, { next: { revalidate: 60 } });
        if (res.ok) {
          const profile = await res.json();
          if (profile) {
            if (profile.instituteName) title = profile.instituteName;
            if (profile.logoUrl) faviconUrl = profile.logoUrl;
          }
        }
      } catch (error) {
        console.error("Error fetching dynamic metadata:", error);
      }
    }

    return {
      title,
      description,
      keywords: process.env.NEXT_PUBLIC_SEO_KEYWORDS || 'institute, management, education',
      robots: {
        index: process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true',
        follow: process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true',
      },
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
    };
  }

  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en">
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('error', function(e) {
                  if (e.message && e.message.includes('ChunkLoadError')) {
                    console.warn('ChunkLoadError detected, reloading page...');
                    window.location.reload();
                  }
                }, true);
              `,
            }}
          />
        </head>
        <body className={`${publicSans.variable} font-public-sans antialiased selection:bg-primary/30`}>
          <FirebaseClientProvider>
            <BrandingManager />
            {children}
            <WhatsAppIcon />
          </FirebaseClientProvider>
        </body>
      </html>
    );
  }
