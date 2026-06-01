import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Job Platform — Sign in',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
