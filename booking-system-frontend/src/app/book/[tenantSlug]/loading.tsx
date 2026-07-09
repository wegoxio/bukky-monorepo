export default function TenantPublicBookingLoading() {
  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            <p className="mt-4 text-sm font-medium text-slate-700">
              Cargando experiencia de reservas...
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
