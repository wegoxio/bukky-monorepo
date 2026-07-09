'use client';

import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, token, isAuthenticated, logout, isLoading } = useAuth();

  if (isLoading) {
    return <p>Cargando...</p>;
  }

  if (!isAuthenticated) {
    return <p>No estás autenticado.</p>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Perfil</h1>

      <p>
        <strong>ID:</strong> {user?.id}
      </p>
      <p>
        <strong>Nombre:</strong> {user?.name}
      </p>
      <p>
        <strong>Email:</strong> {user?.email}
      </p>
      <p>
        <strong>Token:</strong> {token}
      </p>

      <button
        onClick={() => {
          void logout();
        }}
      >
        Cerrar sesión
      </button>
    </main>
  );
}
