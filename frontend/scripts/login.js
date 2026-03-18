import { clearTokens, hasSession, setCurrentUser } from "./modules/auth.js";
import { setRefreshHandler } from "./modules/http.js";
import { login, me, refreshToken } from "./modules/services.js";

setRefreshHandler(refreshToken);

const form = document.getElementById("login-form");
const errorBox = document.getElementById("login-error");

function goDashboard() {
  window.location.href = "./index.html";
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

async function bootstrap() {
  if (!hasSession()) {
    return;
  }

  try {
    const user = await me();
    setCurrentUser(user);
    goDashboard();
  } catch {
    clearTokens();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.classList.add("hidden");

  const data = new FormData(form);
  const username = String(data.get("username") || "").trim();
  const password = String(data.get("password") || "");

  try {
    await login(username, password);
    const user = await me();
    setCurrentUser(user);
    goDashboard();
  } catch (error) {
    showError(error.message || "No se pudo iniciar sesión");
  }
});

await bootstrap();
