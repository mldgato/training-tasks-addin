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
  const [checkedSteps, setCheckedSteps] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [results, setResults] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (token) loadTemplates();
  }, [token]);

  useEffect(() => {
    if (!session || session.mode !== "exam") return;
    setTimeLeft(Math.floor(session.seconds_left));
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleVerifyAll(true);
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : null,
    });
    return res.json();
  };

  const loadTemplates = async () => {
    try {
      setTemplates(await api("/templates"));
    } catch (e) {
      console.error(e);
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
      setCheckedSteps({});
      setResults(null);
    } catch {
      setError("Error al iniciar el ejercicio.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (stepId) => {
    setCheckedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const handleVerifyAll = async (expired = false) => {
    clearInterval(timerRef.current);
    setVerifying(true);
    try {
      const stepResults = await Promise.all(
        session.steps.map(async (step) => {
          const passed = await runChecker(step.check_type, step.check_params);
          return { step_id: step.step_id, passed };
        })
      );

      const data = await api(`/sessions/${session.session_id}/verify-all`, "POST", {
        results: stepResults,
      });

      setResults({
        ...data,
        stepResults,
        expired,
      });
      setSession((prev) => ({ ...prev, status: expired ? "expired" : "completed" }));
    } catch (e) {
      console.error("Error verificando:", e);
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    clearInterval(timerRef.current);
    setToken(null);
    setUser(null);
    setTemplates([]);
    setSession(null);
    setResults(null);
    setCheckedSteps({});
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const checkedCount = Object.values(checkedSteps).filter(Boolean).length;
  const totalCount = session?.steps?.length ?? 0;
  const isExam = session?.mode === "exam";

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

  // ── REPORTE FINAL ──────────────────────────────────────────────────────────
  if (results)
    return (
      <div
        style={{
          fontFamily: "Segoe UI, sans-serif",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "#1a73e8",
            color: "white",
            flexShrink: 0,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{session.template.name}</p>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>
            {results.expired ? "⏰ Tiempo agotado" : "✅ Ejercicio verificado"}
          </p>
        </div>

        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#f5f5f5",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: "bold",
              color: results.score >= 70 ? "#2e7d32" : "#c62828",
            }}
          >
            {results.score}%
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
            {results.passed} de {results.total} pasos correctos
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {session.steps.map((step, i) => {
            const result = results.stepResults.find((r) => r.step_id === step.step_id);
            const passed = result?.passed ?? false;
            return (
              <div
                key={step.step_id}
                style={{
                  padding: "8px 16px",
                  borderBottom: "1px solid #eee",
                  backgroundColor: passed ? "#f1f8e9" : "#fff3f3",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 14, minWidth: 20, marginTop: 1 }}>
                  {passed ? "✅" : "❌"}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: passed ? "#2e7d32" : "#c62828",
                    lineHeight: 1.4,
                  }}
                >
                  <strong>{i + 1}.</strong> {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #eee",
            display: "flex",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => {
              setResults(null);
              setSession(null);
            }}
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: "#1a73e8",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Volver a ejercicios
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

  // ── EJERCICIO ACTIVO ───────────────────────────────────────────────────────
  if (session)
    return (
      <div
        style={{
          fontFamily: "Segoe UI, sans-serif",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "#1a73e8",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, flex: 1, marginRight: 8 }}>
            {session.template.name}
          </span>
          {isExam && (
            <span
              style={{
                fontSize: 14,
                fontWeight: "bold",
                color: timeLeft < 300 ? "#ffcc00" : "white",
                whiteSpace: "nowrap",
              }}
            >
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
        </div>

        <div
          style={{
            padding: "6px 16px",
            backgroundColor: "#e8f0fe",
            fontSize: 12,
            color: "#1a73e8",
            flexShrink: 0,
          }}
        >
          {checkedCount} / {totalCount} marcados
          <div style={{ height: 4, backgroundColor: "#c5cae9", borderRadius: 2, marginTop: 4 }}>
            <div
              style={{
                height: 4,
                backgroundColor: "#1a73e8",
                borderRadius: 2,
                width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {session.steps.map((step, i) => (
            <div
              key={step.step_id}
              onClick={() => toggleCheck(step.step_id)}
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
                backgroundColor: checkedSteps[step.step_id] ? "#f1f8e9" : "white",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                userSelect: "none",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid",
                  borderColor: checkedSteps[step.step_id] ? "#2e7d32" : "#bbb",
                  borderRadius: 3,
                  backgroundColor: checkedSteps[step.step_id] ? "#2e7d32" : "white",
                  flexShrink: 0,
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {checkedSteps[step.step_id] && (
                  <span style={{ color: "white", fontSize: 10, lineHeight: 1 }}>✓</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: checkedSteps[step.step_id] ? "#2e7d32" : "#333",
                    lineHeight: 1.4,
                  }}
                >
                  <strong>{i + 1}.</strong> {step.description}
                </p>
                {!isExam && step.hint && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 11,
                      color: "#1565c0",
                      backgroundColor: "#e3f2fd",
                      padding: "3px 7px",
                      borderRadius: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    💡 {step.hint}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 16px", borderTop: "1px solid #eee", flexShrink: 0 }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#555" }}>
            Cuando termines, guarda el archivo como <strong>.docx</strong> y súbelo para verificar:
          </p>
          <input
            type="file"
            accept=".docx,.docm"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              setVerifying(true);
              try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch(`${API_URL}/sessions/${session.session_id}/verify-file`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                });
                const data = await res.json();
                if (!res.ok) {
                  console.error("Error:", data);
                  return;
                }
                clearInterval(timerRef.current);
                setResults({ ...data, expired: false });
                setSession((prev) => ({ ...prev, status: "completed" }));
              } catch (e) {
                console.error("Error subiendo archivo:", e);
              } finally {
                setVerifying(false);
              }
            }}
            style={{ display: "none" }}
            id="docx-upload"
          />
          <label
            htmlFor="docx-upload"
            style={{
              display: "block",
              textAlign: "center",
              padding: 8,
              backgroundColor: verifying ? "#aaa" : "#2e7d32",
              color: "white",
              borderRadius: 4,
              fontSize: 13,
              cursor: verifying ? "not-allowed" : "pointer",
            }}
          >
            {verifying ? "Verificando..." : "📄 Subir documento y verificar"}
          </label>
          <button
            onClick={handleLogout}
            style={{
              marginTop: 8,
              width: "100%",
              padding: 8,
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
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#666" }}>{t.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6 }}>
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
                <span
                  style={{
                    fontSize: 11,
                    backgroundColor: t.mode === "exam" ? "#fce4ec" : "#e8f5e9",
                    color: t.mode === "exam" ? "#c62828" : "#2e7d32",
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}
                >
                  {t.mode === "exam" ? "Examen" : "Entrenamiento"}
                </span>
              </div>
              <button
                onClick={() => handleStartSession(t.id)}
                disabled={loading}
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
