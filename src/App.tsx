import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppNavbar } from "@/components/AppNavbar";
import Chats from "@/pages/Chats";
import Roles from "@/pages/Roles";
import EditRole from "./pages/EditRole";
import { RoleForm } from "@/components/roles/RoleForm";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/chats" element={<Chats />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/roles/edit/:id" element={<EditRole />} />
        <Route path="/roles/create" element={<RoleForm />} />
      </Routes>
    </Router>
  );
};

export default App;