import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const SERVER_URL = "http://localhost:5000"; // ← change if deployed

export default function AgentChat({ agentId }) {
  const socketRef = useRef(null);

  const [conversations, setConversations] = useState([]); // list of citizens who messaged
  const [selectedCitizenId, setSelectedCitizenId] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);

  // ── Connect Socket ────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("agent_join", { agentId });
    });

    socket.on("disconnect", () => setConnected(false));

    // New message from a citizen
    socket.on("new_citizen_message", (data) => {
      // Update conversations list
      setConversations((prev) => {
        const exists = prev.find((c) => c.citizenId === data.citizenId);
        if (exists) {
          return prev.map((c) =>
            c.citizenId === data.citizenId
              ? { ...c, lastMessage: data.message, unread: (c.unread || 0) + 1 }
              : c
          );
        }
        return [
          { citizenId: data.citizenId, citizenName: data.citizenName, lastMessage: data.message, unread: 1 },
          ...prev,
        ];
      });

      // If this conversation is open, add message directly
      setSelectedCitizenId((current) => {
        if (current === data.citizenId) {
          setMessages((msgs) => [...msgs, data]);
        }
        return current;
      });
    });

    // Confirmation after agent sends
    socket.on("message_sent", (data) => {
      if (data.from_role === "agent") {
        setMessages((msgs) => [...msgs, data]);
      }
    });

    // Someone read the conversation
    socket.on("conversation_read", ({ citizenId }) => {
      setConversations((prev) =>
        prev.map((c) => (c.citizenId === citizenId ? { ...c, unread: 0 } : c))
      );
    });

    return () => socket.disconnect();
  }, [agentId]);

  // ── Load conversations on mount ───────────────────────────────────────────
  useEffect(() => {
    axios.get(`${SERVER_URL}/api/chat/conversations`)
      .then((res) => {
        const convs = res.data.conversations.map((c) => ({
          citizenId:   c.citizen_id,
          citizenName: `${c.prenom} ${c.nom}`,
          lastMessage: c.last_message,
          unread:      parseInt(c.unread_count) || 0,
        }));
        setConversations(convs);
      })
      .catch(console.error);
  }, []);

  // ── Open a conversation ───────────────────────────────────────────────────
  const openConversation = async (citizenId) => {
    setSelectedCitizenId(citizenId);

    // Load history
    try {
      const res = await axios.get(`${SERVER_URL}/api/chat/history/${citizenId}`);
      setMessages(res.data.messages);
    } catch (e) {
      console.error(e);
    }

    // Mark as read
    socketRef.current?.emit("mark_read", { citizenId });
    setConversations((prev) =>
      prev.map((c) => (c.citizenId === citizenId ? { ...c, unread: 0 } : c))
    );
  };

  // ── Send reply ────────────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!input.trim() || !selectedCitizenId) return;

    socketRef.current?.emit("agent_message", {
      citizenId: selectedCitizenId,
      message:   input.trim(),
    });

    setInput("");
  };

  // ── Auto scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const selectedConv = conversations.find((c) => c.citizenId === selectedCitizenId);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial, sans-serif" }}>

      {/* ── Sidebar: conversation list ── */}
      <div style={{ width: 300, borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", background: "#fff" }}>
        {/* Header */}
        <div style={{ padding: "16px", background: "#1e40af", color: "#fff" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>💬 Conversations</h2>
          <small style={{ color: connected ? "#86efac" : "#fca5a5" }}>
            {connected ? "● Connecté" : "○ Déconnecté"}
          </small>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {conversations.length === 0 ? (
            <p style={{ padding: 16, color: "#9ca3af", textAlign: "center" }}>Aucune conversation</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.citizenId}
                onClick={() => openConversation(conv.citizenId)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f3f4f6",
                  background: selectedCitizenId === conv.citizenId ? "#eff6ff" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: "#1e40af", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: "bold", fontSize: 16, flexShrink: 0
                }}>
                  {conv.citizenName?.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: conv.unread > 0 ? "bold" : "normal", fontSize: 14 }}>
                      {conv.citizenName}
                    </span>
                    {conv.unread > 0 && (
                      <span style={{
                        background: "#1e40af", color: "#fff",
                        borderRadius: "50%", padding: "2px 7px", fontSize: 11
                      }}>
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.lastMessage}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f9fafb" }}>
        {selectedCitizenId ? (
          <>
            {/* Chat header */}
            <div style={{ padding: "14px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#1e40af", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "bold"
              }}>
                {selectedConv?.citizenName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: "bold" }}>{selectedConv?.citizenName}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Citoyen</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.map((msg, i) => {
                const isAgent = msg.from_role === "agent";
                return (
                  <div key={msg.id || i} style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "65%",
                      background: isAgent ? "#1e40af" : "#fff",
                      color: isAgent ? "#fff" : "#1f2937",
                      borderRadius: isAgent ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      padding: "10px 14px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }}>
                      <p style={{ margin: 0, fontSize: 14 }}>{msg.message}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.7, textAlign: "right" }}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Écrire une réponse..."
                style={{
                  flex: 1, padding: "10px 16px",
                  border: "1px solid #e5e7eb", borderRadius: 24,
                  fontSize: 14, outline: "none"
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  background: "#1e40af", color: "#fff",
                  border: "none", borderRadius: "50%",
                  width: 42, height: 42, cursor: "pointer",
                  fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                ➤
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#9ca3af" }}>
            <div style={{ fontSize: 64 }}>💬</div>
            <p style={{ fontSize: 16 }}>Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}