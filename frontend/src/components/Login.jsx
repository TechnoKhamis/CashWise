import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError("Fill in all fields");
      return;
    }
    try {
      setLoading(true);
      await authService.login(form);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">
          Cash<span>Wise</span>
        </div>

        <div className="auth-title">Welcome back</div>
        <div className="auth-sub">Sign in to your account</div>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="salman@example.com"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In →"}
        </button>

        <div className="auth-link">
          No account? <a onClick={() => navigate("/register")}>Create one</a>
        </div>
      </div>
    </div>
  );
}
