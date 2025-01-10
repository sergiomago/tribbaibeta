import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import Chats from "@/pages/Chats";
import Roles from "@/pages/Roles";
import EditRole from "./pages/EditRole";
import CreateRole from "./pages/CreateRole";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/chats" element={
              <ProtectedRoute>
                <Chats />
              </ProtectedRoute>
            } />
            <Route path="/roles" element={
              <ProtectedRoute>
                <Roles />
              </ProtectedRoute>
            } />
            <Route path="/roles/edit/:id" element={
              <ProtectedRoute>
                <EditRole />
              </ProtectedRoute>
            } />
            <Route path="/roles/create" element={
              <ProtectedRoute>
                <CreateRole />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;