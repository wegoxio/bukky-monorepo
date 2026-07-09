import PublicBookingManageFlow from '@/modules/bookings/components/PublicBookingManageFlow';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicBookingManagePage({ params }: PageProps) {
  const { token } = await params;
  return <PublicBookingManageFlow token={token} />;
}
