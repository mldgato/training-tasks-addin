import * as React from "react";
import { useState, useEffect } from "react";

const API_URL = "https://training-tasks-api.test/api";

const App = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    if (token) loadTemplates();
  }, [token]);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTemplates(data);
    } catch (e) {
      console.log("Error cargando templates:", e);
    }
  };

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
        setToken(data.token);
        setUser(data.user);
      }
    } catch (e) {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setTemplates([]);
  };

  if (user) {
    return (
      <div style={{ padding: "16px", fontFamily: "Segoe UI, sans-serif" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2 style={{ color: "#1a73e8", margin: 0 }}>TrainingTasks</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
              {user.name} · {user.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              backgroundColor: "#e53935",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </div>

        <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
          Ejercicios disponibles:
        </p>

        {templates.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#999" }}>No hay ejercicios disponibles.</p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "10px",
                marginBottom: "8px",
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: "600" }}>{t.name}</p>
              <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#666" }}>{t.description}</p>
              <span
                style={{
                  fontSize: "11px",
                  backgroundColor: "#e8f0fe",
                  color: "#1a73e8",
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}
              >
                {t.app}
              </span>
            </div>
          ))
        )}
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
