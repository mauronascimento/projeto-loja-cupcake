import './globals.css';
import type { Metadata } from 'next';
import { StoreProvider } from '@/components/store-provider';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Cupcake Store',
  description: 'Loja de cupcakes artesanais',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <StoreProvider>
          <SiteHeader />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
