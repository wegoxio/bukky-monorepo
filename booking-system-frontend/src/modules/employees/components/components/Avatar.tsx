import UiAvatar from '@/modules/ui/Avatar';

export function Avatar({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const sizing = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-11 w-11 text-sm';

  return <UiAvatar name={name} imageUrl={imageUrl} className={sizing} />;
}
