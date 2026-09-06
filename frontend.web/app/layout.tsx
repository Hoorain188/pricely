import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from './context/AuthContext';

export const metadata: Metadata = {
  title: 'Pricely.pk — Smart Price Comparison Pakistan',
  description:
    'Compare live prices across Telemart, Mega.pk, and Daraz. Find the lowest deals on mobiles, laptops, TVs, appliances, and tech in Pakistan.',
  keywords: [
    'Price Comparison Pakistan',
    'Telemart prices',
    'Mega.pk prices',
    'Daraz price comparison',
    'Mobile prices Pakistan',
    'Laptop prices Pakistan',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
