import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import styles from "./Navbar.module.css";

function Navbar({ isAdmin }) {
  // ← receive isAdmin
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>
        HotelBook
      </Link>

      <div className={styles.right}>
        <Link
          to="/"
          className={isActive("/") ? styles.linkActive : styles.link}
        >
          Book Room
        </Link>

        {/* only show Dashboard if admin */}
        {isAdmin && (
          <Link
            to="/admin"
            className={isActive("/admin") ? styles.linkActive : styles.link}
          >
            Dashboard
          </Link>
        )}

        {user ? (
          <button onClick={handleLogout} className={styles.btn}>
            Logout
          </button>
        ) : (
          <button onClick={() => navigate("/login")} className={styles.btn}>
            Login
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
