import AdminLayout from "./AdminLayout";

function AdminSimplePage({ title, description, onAdminLogout }) {
  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[14px] border border-[#ead9cc] bg-[#fffaf5] p-6 shadow-[0_18px_36px_rgba(66,36,18,0.08)]">
          <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#a24a0a]">
            Machinichi Admin
          </p>
          <h1 className="mt-2 text-[32px] font-black tracking-[-0.04em] text-[#27150b]">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] font-medium leading-6 text-[#76675d]">
            {description}
          </p>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminSimplePage;
