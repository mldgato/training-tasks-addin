import * as React from "react";
import { useState } from "react";

const API_URL = "https://training-tasks-api.test/api";

const App = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Error al iniciar sesión.");
      } else {
        setUser(data.user);
        setToken(data.token);
      }
    } catch (e) {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div style={{ padding: "16px", fontFamily: "Segoe UI, sans-serif" }}>
        <h2 style={{ color: "#1a73e8" }}>TrainingTasks</h2>
        <p>
          Bienvenido, <strong>{user.name}</strong>
        </p>
        <p style={{ fontSize: "13px", color: "#666" }}>Rol: {user.role}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", fontFamily: "Segoe UI, sans-serif" }}>
      <h2 style={{ color: "#1a73e8", marginBottom: "4px" }}>TrainingTasks</h2>
      <p style={{ color: "#666", fontSize: "13px", marginTop: 0 }}>Ingresa tus credenciales</p>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            fontSize: "13px",
            boxSizing: "border-box",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            fontSize: "13px",
            boxSizing: "border-box",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: loading ? "#aaa" : "#1a73e8",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "14px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>

      {error && <p style={{ marginTop: "12px", color: "red", fontSize: "13px" }}>{error}</p>}
    </div>
  );
};

export default App;
