import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Chats from "@/pages/Chats";
import Roles from "@/pages/Roles";
import EditRole from "./pages/EditRole";
import CreateRole from "./pages/CreateRole";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/chats" element={<Chats />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/roles/edit/:id" element={<EditRole />} />
          <Route path="/roles/create" element={<CreateRole />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;