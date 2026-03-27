import HomePage from "./pages/HomePage/HomePage";
import "./App.css";
import { Routes, Route } from "react-router";
import AuthPage from "./pages/AuthPage/AuthPage";
import ThreadPage from "./pages/ThreadPage/ThreadPage";
import AuthCallback from "./pages/AuthPage/AuthCallback";
import ResetPasswordPage from "./pages/AuthPage/ResetPasswordPage";
import ProtectedRoute from "./components/shared/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="app">
              <HomePage />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/threads/:threadId"
        element={
          <ProtectedRoute>
            <ThreadPage />
          </ProtectedRoute>
        }
      />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
}

export default App;
