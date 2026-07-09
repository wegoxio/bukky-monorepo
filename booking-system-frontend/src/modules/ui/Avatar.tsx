import Image from 'next/image';

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
};

const AVATAR_COLORS = [
  'bg-surface-warning text-warning',
  'bg-surface-info text-info',
  'bg-surface-success text-success',
  'bg-surface-danger text-danger',
  'bg-surface-subtle text-fg-secondary',
  'bg-surface-muted text-neutral',
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function Avatar({ name, imageUrl, className = '' }: AvatarProps) {
  const colorIndex = name.charCodeAt(0) % AVATAR_COLORS.length;
  const colorClass = AVATAR_COLORS[colorIndex];
  const normalizedImageUrl = imageUrl?.trim() || '';

  if (normalizedImageUrl) {
    return (
      <Image
        src={normalizedImageUrl}
        alt={name}
        width={32}
        height={32}
        unoptimized
        className={`inline-flex h-8 w-8 rounded-full object-cover ${className}`.trim()}
      />
    );
  }

  return (
    <div
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold ${colorClass} ${className}`.trim()}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
