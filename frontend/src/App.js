import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { SoundProvider } from "@/context/SoundContext";
import { Navbar } from "@/components/Navbar";
import { CyberBackground } from "@/components/CyberBackground";
import { IntroScreen } from "@/components/IntroScreen";
import Home from "@/pages/Home";
import Rules from "@/pages/Rules";
import Story from "@/pages/Story";
import HallOfShame from "@/pages/HallOfShame";
import Apply from "@/pages/Apply";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";

function App() {
  return (
    <AuthProvider>
      <SoundProvider>
        <BrowserRouter>
          <IntroScreen />
          <div className="min-h-screen scanlines relative">
            <CyberBackground />
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/story" element={<Story />} />
              <Route path="/shame" element={<HallOfShame />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </div>
          <Toaster
            position="top-center"
            theme="dark"
            toastOptions={{
              style: {
                background: "#12070a",
                border: "1px solid rgba(255,30,60,0.3)",
                color: "#f1f5f9",
                fontFamily: "Cairo, sans-serif",
                direction: "rtl",
              },
            }}
          />
        </BrowserRouter>
      </SoundProvider>
    </AuthProvider>
  );
}

export default App;
