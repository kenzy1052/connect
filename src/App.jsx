import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppRouter from "./Router";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-app text-main">
          <AppRouter />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
