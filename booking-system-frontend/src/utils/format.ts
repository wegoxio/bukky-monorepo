//Funcion helper que retorna las dos primeras iniciales de un nombre, se usa para los avatars
export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

//Funcion helper para cambiar entre tonos para los avatars de usuarios
export function getAvatarTone(seed: string) {
  const tones = [
    'bg-surface-warning text-warning ring-border-warning',
    'bg-surface-info text-info ring-border-info',
    'bg-surface-success text-success ring-border-success',
    'bg-surface-danger text-danger ring-border-danger',
    'bg-surface-subtle text-fg-secondary ring-border-soft',
  ];
  const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % tones.length;
  return tones[index];
}

export function formatPrice(value: string | number) {
  const amount = typeof value === 'number' ? value : Number(value);
  return amount.toFixed(2);
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES');
}

export function normalizeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatRelativeTime(dateIso: string) {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

export function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatCompactCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${value.toFixed(0)} ${currency}`;
  }
}

export function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function normalizeString(name: string) {
  return name.trim() ?? '';
}
