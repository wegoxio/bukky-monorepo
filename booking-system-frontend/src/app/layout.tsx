import type { Metadata } from 'next';
import { headers } from 'next/headers';
import 'driver.js/dist/driver.css';
import './globals.css';
import AppToaster from '@/modules/ui/AppToaster';

export const metadata: Metadata = {
  title: 'Sistema de Reservas Bukky',
  description: 'Plataforma de reservas y gestión operativa de Bukky',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="es">
      <head>{nonce ? <meta name="csp-nonce" content={nonce} /> : null}</head>
      <body>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
