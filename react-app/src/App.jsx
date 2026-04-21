import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { useAuth } from "./hooks/useAuth.js";

function App() {
  const { isAuth, loading, loginSuccess } = useAuth();

  if (loading) return <p>Cargando...</p>;

  return isAuth ? (
    <Dashboard />
  ) : (
    <Login onLogin={loginSuccess} />
  );
}

export default App;