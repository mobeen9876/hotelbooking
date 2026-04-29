import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [chats, setChats] = useState({});

  // readMap stores { [userId]: { lastSeenAdminId, lastSeenUserId } }
  // These are actual DB message IDs — stable across devices and refreshes
  const [readMap, setReadMap] = useState(() => {
    try {
      const saved = localStorage.getItem("chat_readMap_v3");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("chat_readMap_v3", JSON.stringify(readMap));
    } catch {}
  }, [readMap]);

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
              { id: msg.id, from: msg.from, text: msg.text, time },
            ],
          }));
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Messages channel issue:", status, err);
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
        id: msg.id,
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
    const { error } = await supabase.from("messages").insert({
      user_id: userId,
      from,
      text,
    });
    if (error) console.error(error);
  };

  // Admin: red dot if there are user messages with id > lastSeenUserId
  const hasUnread = (userId) => {
    const msgs = chats[userId] || [];
    const lastSeen = readMap[userId]?.lastSeenUserId ?? 0;
    return msgs.some((m) => m.from === "user" && m.id > lastSeen);
  };

  // Admin opens a chat — save the highest user message id as seen
  const markRead = (userId) => {
    const msgs = chats[userId] || [];
    const userMsgs = msgs.filter((m) => m.from === "user");
    if (userMsgs.length === 0) return;
    const maxId = Math.max(...userMsgs.map((m) => m.id));
    setReadMap((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], lastSeenUserId: maxId },
    }));
  };

  // User: red dot if there are admin messages with id > lastSeenAdminId
  const hasAdminReply = (userId) => {
    const msgs = chats[userId] || [];
    const lastSeen = readMap[userId]?.lastSeenAdminId ?? 0;
    return msgs.some((m) => m.from === "admin" && m.id > lastSeen);
  };

  // User opens their chat — save the highest admin message id as seen
  const markUserRead = (userId) => {
    const msgs = chats[userId] || [];
    const adminMsgs = msgs.filter((m) => m.from === "admin");
    if (adminMsgs.length === 0) return;
    const maxId = Math.max(...adminMsgs.map((m) => m.id));
    setReadMap((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], lastSeenAdminId: maxId },
    }));
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
