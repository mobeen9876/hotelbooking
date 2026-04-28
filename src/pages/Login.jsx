import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import styles from "./Login.module.css";
import { supabase } from "../supabaseClient";
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

   setLoading(false);

if (error) {
  Swal.fire({
    icon: 'error',
    title: 'Login Failed',
    text: error.message,
    confirmButtonColor: '#1C1C1E',
  })
  return
}
Swal.fire({
  icon: 'success',
  title: 'Welcome Back!',
  text: 'You are now logged in.',
  confirmButtonColor: '#1C1C1E',
})
navigate('/')
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.tag}>✦ Welcome Back</div>
        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.sub}>
          No account?{" "}
          <span className={styles.link} onClick={() => navigate("/signup")}>
            Create one
          </span>
        </p>

        <form onSubmit={handleLogin}>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
