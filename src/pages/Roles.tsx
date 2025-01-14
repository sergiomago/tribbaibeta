import { AppNavbar } from "@/components/AppNavbar";
import { RolePackages } from "@/components/roles/RolePackages";
import { RoleCountDisplay } from "@/components/roles/RoleCountDisplay";
import { RoleManagement } from "@/components/roles/RoleManagement";

const Roles = () => {
  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1">
        <RoleManagement />
      </main>
    </div>
  );
};

export default Roles;