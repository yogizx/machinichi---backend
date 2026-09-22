import AdminSidebar from "./AdminSidebar";

function AdminLayout({ children, onAdminLogout }) {
  return (
    <div className="min-h-screen bg-[#f7efe7] text-[#2b1b12] md:flex md:overflow-hidden">
      <AdminSidebar onAdminLogout={onAdminLogout} />
      <main className="min-w-0 flex-1 overflow-x-hidden md:h-screen md:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
