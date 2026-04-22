import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { useAuth } from "./hooks/useAuth.js";

function App() {
  const { isAuth, loading, user, loginSuccess } = useAuth();

  if (loading) return <p>Cargando...</p>;

  return isAuth ? (
    <Dashboard user={user}/>
  ) : (
    <Login onLogin={loginSuccess} />
  );
}

export default App;