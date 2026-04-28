import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [chats, setChats] = useState({});
  const [readMap, setReadMap] = useState({});

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
          console.warn("Messages channel issue:", status, err);
          // Fallback: refetch all messages so nothing is missed
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
    const { error } = await supabase.from("messages").insert({
      user_id: userId,
      from,
      text,
    });
    if (error) console.error(error);
  };

  // returns true if there are messages from "user" that haven't been read yet
  const hasUnread = (userId) => {
    const msgs = chats[userId] || [];
    const lastReadIndex = readMap[userId] ?? -1;
    return msgs.some((m, i) => m.from === "user" && i > lastReadIndex);
  };

  // call this when admin opens a chat to clear the red dot
  const markRead = (userId) => {
    const msgs = chats[userId] || [];
    setReadMap((prev) => ({ ...prev, [userId]: msgs.length - 1 }));
  };

  // returns true if there are new "admin" messages the user hasn't seen
  const hasAdminReply = (userId) => {
    const msgs = chats[userId] || [];
    const lastReadIndex = readMap[userId] ?? -1;
    return msgs.some((m, i) => m.from === "admin" && i > lastReadIndex);
  };

  // call this when user opens their chat window
  const markUserRead = (userId) => {
    const msgs = chats[userId] || [];
    setReadMap((prev) => ({ ...prev, [userId]: msgs.length - 1 }));
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
