import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/register";
import ForgotPasswordPage from "./pages/forgetPassword";
import Status from "./pages/Status";
import RequireAuth from "./components/RequireAuth";
import DefectLog from "./pages/defectLog";
import AIControls from "./pages/AIControls";


export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/defect-log" element={<RequireAuth><DefectLog /></RequireAuth>} />
        <Route path="/ai-control" element={<RequireAuth><AIControls /></RequireAuth>} />
        <Route path="/status" element={<RequireAuth><Status /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  )
}
export default App