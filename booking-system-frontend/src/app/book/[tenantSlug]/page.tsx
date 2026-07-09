import TenantPublicBookingFlow from '@/modules/bookings/components/TenantPublicBookingFlow';

type TenantPublicBookingPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function TenantPublicBookingPage({ params }: TenantPublicBookingPageProps) {
  const { tenantSlug } = await params;
  return <TenantPublicBookingFlow tenantSlug={tenantSlug} />;
}
