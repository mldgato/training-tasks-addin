import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { runChecker } from "../checkers/checker.js";

const API_URL = "https://training-tasks-api.test/api";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [verifying, setVerifying] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (token) loadTemplates();
  }, [token]);

  useEffect(() => {
    if (!session) return;
    setTimeLeft(Math.floor(session.seconds_left));
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleExpire();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [session?.session_id]);

  const api = async (path, method = "GET", body = null) => {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : null,
    });
    return res.json();
  };

  const loadTemplates = async () => {
    try {
      const data = await api("/templates");
      setTemplates(data);
    } catch (e) {
      console.error("Error cargando templates:", e);
    }
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.message || "Error al iniciar sesión.");
      else {
        setToken(data.token);
        setUser(data.user);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (templateId) => {
    setLoading(true);
    try {
      const data = await api("/sessions/start", "POST", { template_id: templateId });
      setSession(data);
    } catch {
      setError("Error al iniciar el ejercicio.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStep = async (step) => {
    setVerifying(step.step_id);
    try {
      const passed = await runChecker(step.check_type, step.check_params);
      await api(`/sessions/${session.session_id}/verify/${step.step_id}`, "POST", { passed });
      setSession((prev) => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.step_id === step.step_id ? { ...s, passed, attempts: s.attempts + 1 } : s
        ),
      }));
    } catch (e) {
      console.error("Error verificando paso:", e);
    } finally {
      setVerifying(null);
    }
  };

  const handleFinish = async () => {
    clearInterval(timerRef.current);
    const data = await api(`/sessions/${session.session_id}/finish`, "POST");
    setSession((prev) => ({ ...prev, status: "completed", score: data.score }));
  };

  const handleExpire = async () => {
    await api(`/sessions/${session.session_id}/expire`, "POST");
    setSession((prev) => ({ ...prev, status: "expired" }));
  };

  const handleLogout = () => {
    clearInterval(timerRef.current);
    setToken(null);
    setUser(null);
    setTemplates([]);
    setSession(null);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const passedCount = session?.steps?.filter((s) => s.passed).length ?? 0;
  const totalCount = session?.steps?.length ?? 0;

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!user)
    return (
      <div style={{ padding: 16, fontFamily: "Segoe UI, sans-serif" }}>
        <h2 style={{ color: "#1a73e8", marginBottom: 4 }}>TrainingTasks</h2>
        <p style={{ color: "#666", fontSize: 13, marginTop: 0 }}>Ingresa tus credenciales</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              fontSize: 13,
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              fontSize: 13,
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            backgroundColor: loading ? "#aaa" : "#1a73e8",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
        {error && <p style={{ marginTop: 12, color: "red", fontSize: 13 }}>{error}</p>}
      </div>
    );

  // ── RESULTADO FINAL ────────────────────────────────────────────────────────
  if (session && (session.status === "completed" || session.status === "expired"))
    return (
      <div style={{ padding: 16, fontFamily: "Segoe UI, sans-serif", textAlign: "center" }}>
        <h2 style={{ color: "#1a73e8" }}>TrainingTasks</h2>
        <p style={{ fontSize: 13, color: "#666" }}>
          {session.status === "expired" ? "⏰ Tiempo agotado" : "✅ Ejercicio completado"}
        </p>
        <div
          style={{
            fontSize: 48,
            fontWeight: "bold",
            color: session.score >= 70 ? "#2e7d32" : "#c62828",
            margin: "16px 0",
          }}
        >
          {session.score}%
        </div>
        <p style={{ fontSize: 13, color: "#444" }}>
          {passedCount} de {totalCount} pasos correctos
        </p>
        <button
          onClick={() => setSession(null)}
          style={{
            marginTop: 16,
            padding: "8px 24px",
            backgroundColor: "#1a73e8",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Volver a ejercicios
        </button>
      </div>
    );

  // ── EJERCICIO ACTIVO ───────────────────────────────────────────────────────
  if (session)
    return (
      <div style={{ fontFamily: "Segoe UI, sans-serif" }}>
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "#1a73e8",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>{session.template.name}</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: timeLeft < 300 ? "#ffcc00" : "white",
            }}
          >
            ⏱ {formatTime(timeLeft)}
          </span>
        </div>
        <div
          style={{
            padding: "6px 16px",
            backgroundColor: "#e8f0fe",
            fontSize: 12,
            color: "#1a73e8",
          }}
        >
          {passedCount} / {totalCount} pasos completados
          <div style={{ height: 4, backgroundColor: "#c5cae9", borderRadius: 2, marginTop: 4 }}>
            <div
              style={{
                height: 4,
                backgroundColor: "#1a73e8",
                borderRadius: 2,
                width: `${(passedCount / totalCount) * 100}%`,
              }}
            />
          </div>
        </div>
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 160px)" }}>
          {session.steps.map((step, i) => (
            <div
              key={step.step_id}
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid #eee",
                backgroundColor: step.passed ? "#f1f8e9" : "white",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 16, minWidth: 20 }}>{step.passed ? "✅" : "⬜"}</span>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: step.passed ? "#2e7d32" : "#333",
                    }}
                  >
                    {i + 1}. {step.description}
                  </p>
                  {!step.passed && (
                    <p style={{ margin: "0 0 6px", fontSize: 11, color: "#666" }}>{step.hint}</p>
                  )}
                  {!step.passed && (
                    <button
                      onClick={() => handleVerifyStep(step)}
                      disabled={verifying === step.step_id}
                      style={{
                        padding: "4px 12px",
                        fontSize: 11,
                        backgroundColor: "#1a73e8",
                        color: "white",
                        border: "none",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                    >
                      {verifying === step.step_id ? "Verificando..." : "Verificar"}
                    </button>
                  )}
                  {step.attempts > 0 && !step.passed && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#e53935" }}>
                      ✗ Incorrecto ({step.attempts} intento{step.attempts > 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
          <button
            onClick={handleFinish}
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: "#2e7d32",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Finalizar
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 12px",
              backgroundColor: "#e53935",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </div>
      </div>
    );

  // ── LISTA DE EJERCICIOS ────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16, fontFamily: "Segoe UI, sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ color: "#1a73e8", margin: 0 }}>TrainingTasks</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{user.name}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "6px 12px",
            backgroundColor: "#e53935",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Salir
        </button>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ejercicios disponibles:</p>
      {templates.length === 0 ? (
        <p style={{ fontSize: 13, color: "#999" }}>No hay ejercicios disponibles.</p>
      ) : (
        templates.map((t) => (
          <div
            key={t.id}
            style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10, marginBottom: 8 }}
          >
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{t.name}</p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#666" }}>{t.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: 11,
                  backgroundColor: "#e8f0fe",
                  color: "#1a73e8",
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {t.app}
              </span>
              <button
                onClick={() => handleStartSession(t.id)}
                style={{
                  padding: "6px 14px",
                  backgroundColor: "#1a73e8",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Iniciar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
