import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import styles from "./Signup.module.css";
import { supabase } from "../supabaseClient";
function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      Swal.fire({
        icon: "warning",
        title: "Password too short",
        text: "Must be at least 6 characters.",
        confirmButtonColor: "#1C1C1E",
      });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Signup Failed",
        text: error.message,
        confirmButtonColor: "#1C1C1E",
      });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Account Created!",
      text: "Check your email to verify.",
      confirmButtonColor: "#1C1C1E",
    });
    navigate("/login");
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.tag}>✦ Join Us</div>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.sub}>
          Already have one?{" "}
          <span className={styles.link} onClick={() => navigate("/login")}>
            Sign in
          </span>
        </p>

        <form onSubmit={handleSignup}>
          <div className={styles.group}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              required
              className={styles.input}
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              required
              className={styles.input}
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "Creating..." : "Create Account →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Signup;
