import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import authService from "../services/authService";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUB_KEY);

// ── Step 1 ──
function StepOne({ onNext }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    currency: "BHD",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
//    setLoading(true);
  //        onNext(form);

    //return;
    if (!form.fullName || !form.email || !form.password) {
      setError("Fill all fields");
      return;
    }
    if (form.password.length < 6) {
      setError("Password too short");
      return;
    }
    try {
      setLoading(true);
      await authService.register(form);
      onNext(form);
    } catch {
      setError("Email already exists");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-title">Create account</div>
      <div className="auth-sub">Step 1 of 2 — Your details</div>
      {error && <div className="error-msg">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            className="form-input"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Salman Khamis"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Currency</label>
          <select
            className="form-input"
            name="currency"
            value={form.currency}
            onChange={handleChange}
          >
            <option value="BHD">🇧🇭 BHD</option>
            <option value="USD">🇺🇸 USD</option>
            <option value="SAR">🇸🇦 SAR</option>
            <option value="AED">🇦🇪 AED</option>
          </select>
        </div>
      </div>
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
          placeholder="Min. 6 characters"
        />
      </div>
      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? "Creating..." : "Continue → Link Card"}
      </button>
    </>
  );
}

// ── Step 2 ──
function StepTwo({ userData, onNext, onSkip }) {
  const stripe = useStripe();
  const elements = useElements();
  const [selectedBank, setSelectedBank] = useState("NBB");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const banks = [
    { name: "NBB", emoji: "🏦" },
    { name: "BBK", emoji: "🏛" },
    { name: "AHB", emoji: "🏢" },
    { name: "HSBC", emoji: "🔴" },
    { name: "Citi", emoji: "🔵" },
    { name: "Other", emoji: "➕" },
  ];

  const handleVerify = async () => {
    try {
      setLoading(true);
      const res = await authService.createSetupIntent();
      const { clientSecret } = res.data;
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      await authService.saveCard({
        bankName: selectedBank,
        stripePaymentMethodId: result.setupIntent.payment_method,
      });
      onNext();
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-title">Link your card</div>
      <div className="auth-sub">Step 2 of 2 — For loan payments via Stripe</div>
      {error && <div className="error-msg">{error}</div>}

      <div className="form-group">
        <label className="form-label">Card Details</label>
        <div className="card-element-wrap">
          <CardElement
            options={{
              style: {
                base: {
                  color: "#E6EDF3",
                  fontSize: "14px",
                  fontFamily: "JetBrains Mono",
                },
              },
            }}
          />
        </div>
      </div>

      <button className="btn-primary" onClick={handleVerify} disabled={loading}>
        {loading ? "Verifying..." : "Verify & Finish →"}
      </button>
      <button className="btn-ghost" onClick={onSkip}>
        Skip — add later in Settings
      </button>
      <div className="stripe-note">Secured by Stripe · Test mode</div>
    </>
  );
}

// ── Step 3 ──
function StepThree({ skipped }) {
  const navigate = useNavigate();
  return (
    <div className="success-screen">
      <div className="success-icon">🎉</div>
      <div className="success-title">You're all set!</div>
      <div className="success-sub">
        {skipped
          ? "Account created. Add your card anytime in Settings."
          : "Account created and card linked successfully."}
      </div>
      <button className="btn-primary" onClick={() => navigate("/dashboard")}>
        Go to Dashboard →
      </button>
    </div>
  );
}

// ── Main Register page ──
export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({});
  const [skipped, setSkipped] = useState(false);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">
          Cash<span>Wise</span>
        </div>

        {/* Step indicator */}
        <div className="steps">
          <div
            className={`step-circle ${step >= 1 ? (step > 1 ? "done" : "active") : ""}`}
          >
            {step > 1 ? "✓" : "1"}
          </div>
          <span className={`step-label ${step === 1 ? "active" : ""}`}>
            Account
          </span>
          <div className={`step-line ${step > 1 ? "done" : ""}`}></div>
          <div
            className={`step-circle ${step >= 2 ? (step > 2 ? "done" : "active") : ""}`}
          >
            {step > 2 ? "✓" : "2"}
          </div>
          <span className={`step-label ${step === 2 ? "active" : ""}`}>
            Card
          </span>
          <div className={`step-line ${step > 2 ? "done" : ""}`}></div>
          <div className={`step-circle ${step === 3 ? "active" : ""}`}>3</div>
          <span className={`step-label ${step === 3 ? "active" : ""}`}>
            Done
          </span>
        </div>

        <Elements stripe={stripePromise}>
          {step === 1 && (
            <StepOne
              onNext={(data) => {
                setUserData(data);
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <StepTwo
              userData={userData}
              onNext={() => setStep(3)}
              onSkip={() => {
                setSkipped(true);
                setStep(3);
              }}
            />
          )}
          {step === 3 && <StepThree skipped={skipped} />}
        </Elements>

        {step === 1 && (
          <div className="auth-link">
            Already have an account?{" "}
            <a onClick={() => navigate("/login")}>Sign in</a>
          </div>
        )}
      </div>
    </div>
  );
}
