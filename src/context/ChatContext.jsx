import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const ChatContext = createContext();

// helpers to persist read state across refreshes
const getReadMap = () => {
  try {
    return JSON.parse(localStorage.getItem("chatReadMap") || "{}");
  } catch {
    return {};
  }
};
const saveReadMap = (map) => {
  localStorage.setItem("chatReadMap", JSON.stringify(map));
};

export function ChatProvider({ children }) {
  const [chats, setChats] = useState({});
  const [readMap, setReadMap] = useState(getReadMap); // load from localStorage

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          const time = new Date(msg.created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
          setChats((prev) => ({
            ...prev,
            [msg.user_id]: [
              ...(prev[msg.user_id] || []),
              { from: msg.from, text: msg.text, time },
            ],
          }));
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          fetchMessages();
        }
      });

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const grouped = {};
    data.forEach((msg) => {
      if (!grouped[msg.user_id]) grouped[msg.user_id] = [];
      grouped[msg.user_id].push({
        from: msg.from,
        text: msg.text,
        time: new Date(msg.created_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    });
    setChats(grouped);
  };

  const sendMessage = async (userId, from, text) => {
    const { error } = await supabase
      .from("messages")
      .insert({ user_id: userId, from, text });
    if (error) console.error(error);
  };

  const hasUnread = (userId) => {
    const msgs = chats[userId] || [];
    const lastReadIndex = readMap[userId] ?? -1;
    return msgs.some((m, i) => m.from === "user" && i > lastReadIndex);
  };

  const markRead = (userId) => {
    const msgs = chats[userId] || [];
    const newMap = { ...readMap, [userId]: msgs.length - 1 };
    setReadMap(newMap);
    saveReadMap(newMap); // ← persists across refresh
  };

  const hasAdminReply = (userId) => {
    const msgs = chats[userId] || [];
    const lastReadIndex = readMap[userId] ?? -1;
    return msgs.some((m, i) => m.from === "admin" && i > lastReadIndex);
  };

  const markUserRead = (userId) => {
    const msgs = chats[userId] || [];
    const newMap = { ...readMap, [userId]: msgs.length - 1 };
    setReadMap(newMap);
    saveReadMap(newMap);
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        sendMessage,
        hasUnread,
        markRead,
        hasAdminReply,
        markUserRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
