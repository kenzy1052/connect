import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppRouter from "./Router";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 5000,
            style: {
              background: "hsl(var(--surface))",
              color: "hsl(var(--text))",
              border: "1px solid hsl(var(--border))",
              maxWidth: "90vw",
            },
          }}
        />

        <div className="min-h-screen bg-app text-main">
          <AppRouter />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
