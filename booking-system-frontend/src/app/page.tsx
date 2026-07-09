import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import LoginForm from '@/modules/auth/components/LoginForm';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </Suspense>
  );
}
