import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import styles from "./Admin.module.css";
import { useChat } from "../context/ChatContext";
import { supabase } from "../supabaseClient";

function AdminChatPopup({ userId, userEmail, onClose }) {
  const { chats, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const messages = chats[userId] || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(userId, "admin", input.trim());
    setInput("");
  };

  return (
    <div className={styles.chatPopup}>
      <div className={styles.chatHeader}>
        <span>{userEmail}</span>
        <button className={styles.chatClose} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className={styles.chatBody}>
        {messages.length === 0 && (
          <p className={styles.chatEmpty}>No messages yet</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.from === "admin" ? styles.rowAdmin : styles.rowUser}
          >
            <div
              className={
                m.from === "admin" ? styles.bubbleAdmin : styles.bubbleUser
              }
            >
              <p>{m.text}</p>
              <span className={styles.time}>{m.time}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className={styles.chatFooter} onSubmit={send}>
        <input
          className={styles.chatInput}
          placeholder="Reply..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className={styles.chatSend}>
          ➤
        </button>
      </form>
    </div>
  );
}

function Admin() {
  const [bookings, setBookings] = useState([]);
  const [openChat, setOpenChat] = useState(null);
  const { hasUnread, markRead } = useChat();

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("bookings-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          fetchBookings();
          Swal.fire({
            icon: "info",
            title: "🔔 New Booking!",
            text: `${payload.new.user_email} booked ${payload.new.date}`,
            timer: 5000,
            timerProgressBar: true,
            toast: true,
            position: "top-end",
            showConfirmButton: false,
          });
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    setBookings(data);
  };

  const handleChatOpen = (userId) => {
    if (openChat === userId) {
      setOpenChat(null);
    } else {
      setOpenChat(userId);
      markRead(userId);
    }
  };

  const formatDate = (str) =>
    new Date(str + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const openBooking = bookings.find((b) => b.user_id === openChat);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.tag}>✦ Dashboard</div>
        <h1 className={styles.title}>Admin Panel</h1>
        <p className={styles.sub}>All bookings appear here in real time</p>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHead}>
          <span className={styles.tableTitle}>All Bookings</span>
          <span className={styles.live}>● Live</span>
        </div>

        {bookings.length === 0 ? (
          <p className={styles.empty}>No bookings yet</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>User</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Chat</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={styles.tr}>
                    <td className={styles.td}>{b.user_email.split("@")[0]}</td>
                    <td className={styles.td}>{b.user_email}</td>
                    <td className={styles.td}>{formatDate(b.date)}</td>
                    <td className={styles.td}>
                      <button
                        className={styles.chatBtn}
                        onClick={() => handleChatOpen(b.user_id)}
                      >
                        💬
                        {hasUnread(b.user_id) && openChat !== b.user_id && (
                          <span className={styles.dot} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openChat && openBooking && (
        <AdminChatPopup
          userId={openChat}
          userEmail={openBooking.user_email}
          onClose={() => setOpenChat(null)}
        />
      )}
    </div>
  );
}

export default Admin;
