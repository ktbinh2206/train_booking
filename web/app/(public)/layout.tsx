"use client";

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTicketDetailPage = pathname.startsWith('/tickets/');

  if (isTicketDetailPage) {
    return <main className="min-h-screen bg-gray-100">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-gray-50">{children}</main>
      <Footer />
    </div>
  );
}
