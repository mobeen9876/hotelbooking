import { useState, useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import styles from "./ChatWindow.module.css";

export default function ChatWindow({ userId, label, onClose }) {
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
    sendMessage(userId, "user", input.trim());
    setInput("");
  };

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <span>{label}</span>
        <button className={styles.close} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.body}>
        {messages.length === 0 && (
          <p className={styles.empty}>No messages yet</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.from === "user" ? styles.rowUser : styles.rowAdmin}
          >
            <div
              className={
                m.from === "user" ? styles.bubbleUser : styles.bubbleAdmin
              }
            >
              <p>{m.text}</p>
              <span className={styles.time}>{m.time}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className={styles.footer} onSubmit={send}>
        <input
          className={styles.input}
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className={styles.sendBtn}>
          ➤
        </button>
      </form>
    </div>
  );
}
