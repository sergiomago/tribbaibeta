import { AppNavbar } from "@/components/AppNavbar";
import { RoleManagement } from "@/components/roles/RoleManagement";

const Roles = () => {
  return (
    <div className="min-h-screen">
      <AppNavbar />
      <main className="container mx-auto py-6">
        <RoleManagement />
      </main>
    </div>
  );
};

export default Roles;