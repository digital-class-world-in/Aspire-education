import type {Metadata} from 'next';
import '../globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from "@/components/ui/toaster";
import { AuthCheck } from "@/components/auth/auth-check";
import { SubscriptionGuard } from "@/components/subscription-guard";

export const metadata: Metadata = {
  title: 'Institute Management System',
  description: 'Professional Management For Educational Institutes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <FirebaseClientProvider>
        <AuthCheck>
          <SubscriptionGuard>
            {children}
          </SubscriptionGuard>
        </AuthCheck>
        <Toaster />
      </FirebaseClientProvider>
    </>
  );
}
