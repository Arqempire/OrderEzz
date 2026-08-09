import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import '@/styles/globals.css';
import '@/styles/order.css';
import '@/styles/staff.css';
import '@/styles/admin.css';
import { Toaster } from 'sonner';


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'OrderEzz | Dine-In Table Ordering',
  description: 'Scan QR code, view menu, place orders, and track your table order live.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950 flex flex-col min-h-screen">
        <div className="flex-1">{children}</div>
        <footer className="py-3 px-4 text-center text-[11px] font-medium text-slate-400/70 select-none bg-slate-950 border-t border-slate-900/60 relative z-0">
          Powered by <span className="text-amber-400 font-bold font-display">OrderEzz</span> a <span className="text-slate-300 font-semibold">ARQ technologies</span> product
        </footer>
        <Toaster position="top-center" theme="dark" richColors />
      </body>
    </html>
  );
}
