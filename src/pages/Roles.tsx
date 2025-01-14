import { AppNavbar } from "@/components/AppNavbar";
import { RoleManagement } from "@/components/roles/RoleManagement";
import { useSubscription } from "@/contexts/SubscriptionContext";

const Roles = () => {
  const { hasSubscription } = useSubscription();

  return (
    <div className="min-h-screen">
      <AppNavbar />
      <main className="container mx-auto py-6">
        <RoleManagement isDisabled={!hasSubscription} />
      </main>
    </div>
  );
};

export default Roles;