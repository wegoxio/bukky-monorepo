'use client';

import { Toaster } from 'react-hot-toast';

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3600,
        style: {
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-row)',
        },
        success: {
          iconTheme: {
            primary: 'var(--success)',
            secondary: 'var(--surface)',
          },
        },
        error: {
          iconTheme: {
            primary: 'var(--danger)',
            secondary: 'var(--surface)',
          },
        },
      }}
    />
  );
}
