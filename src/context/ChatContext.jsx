import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [chats, setChats] = useState({});

  // readMap stores { [userId]: { adminCount, userCount } }
  // adminCount = how many admin messages were seen last time user opened chat
  // userCount  = how many user messages were seen last time admin opened chat
  const [readMap, setReadMap] = useState(() => {
    try {
      const saved = localStorage.getItem("chat_readMap_v2");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("chat_readMap_v2", JSON.stringify(readMap));
    } catch {
      // ignore storage errors
    }
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
              { from: msg.from, text: msg.text, time },
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

  // Admin: red dot if user sent messages since admin last opened that chat
  const hasUnread = (userId) => {
    const msgs = chats[userId] || [];
    const totalUserMsgs = msgs.filter((m) => m.from === "user").length;
    const seenUserMsgs = readMap[userId]?.userCount ?? 0;
    return totalUserMsgs > seenUserMsgs;
  };

  // Admin opens a chat — mark all current user messages as seen
  const markRead = (userId) => {
    const msgs = chats[userId] || [];
    const totalUserMsgs = msgs.filter((m) => m.from === "user").length;
    setReadMap((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], userCount: totalUserMsgs },
    }));
  };

  // User: red dot if admin sent messages since user last opened chat
  const hasAdminReply = (userId) => {
    const msgs = chats[userId] || [];
    const totalAdminMsgs = msgs.filter((m) => m.from === "admin").length;
    const seenAdminMsgs = readMap[userId]?.adminCount ?? 0;
    return totalAdminMsgs > seenAdminMsgs;
  };

  // User opens their chat — mark all current admin messages as seen
  const markUserRead = (userId) => {
    const msgs = chats[userId] || [];
    const totalAdminMsgs = msgs.filter((m) => m.from === "admin").length;
    setReadMap((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], adminCount: totalAdminMsgs },
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
