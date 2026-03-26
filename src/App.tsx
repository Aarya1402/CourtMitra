import HomePage from "./pages/HomePage/HomePage";
import "./App.css";
import { Routes, Route } from "react-router";
import AuthPage from "./pages/AuthPage/AuthPage";
import ThreadPage from "./pages/ThreadPage/ThreadPage";
import AuthCallback from "./pages/AuthPage/AuthCallback";
import ResetPasswordPage from "./pages/AuthPage/ResetPasswordPage";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="app">
            <HomePage />
          </div>
        }
      />
      <Route path="/threads/:threadId" element={<ThreadPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
}

export default App;
