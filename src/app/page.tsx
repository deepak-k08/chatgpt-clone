// file-path: chatgpt-clone-mobile/src/app/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "../utils/trpc";
import { v4 as uuidv4 } from "uuid";

export default function Chat() {
  const [newMessage, setNewMessage] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch or create session ID safely
  useEffect(() => {
    let stored = localStorage.getItem("chat_session_id");
    if (!stored) {
      stored = uuidv4();
      localStorage.setItem("chat_session_id", stored);
    }
    setSessionId(stored);
  }, []);

  const { data: messages, refetch } = trpc.chat.getMessages.useQuery(
    { session_id: sessionId },
    { enabled: !!sessionId }
  );

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const newSessionMutation = trpc.chat.newSession.useMutation();

  const handleSend = async () => {
    if (!newMessage.trim() || !sessionId) return;
    await sendMessageMutation.mutateAsync({ content: newMessage, session_id: sessionId });
    setNewMessage("");
    refetch();
  };

  const handleNewConversation = async () => {
    const { sessionId: newId } = await newSessionMutation.mutateAsync();
    localStorage.setItem("chat_session_id", newId);
    setSessionId(newId);
    refetch(); // fetch messages for new session (will be empty)
  };

  // Scroll to bottom whenever messages or session change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sessionId]);

  return (
    <div className="container d-flex flex-column vh-100 p-3">
      {/* New Conversation Button */}
      <div className="mb-3 d-flex justify-content-end">
        <button className="btn btn-warning" onClick={handleNewConversation}>
          New Conversation
        </button>
      </div>

      {/* Chat window */}
      <div className="flex-grow-1 overflow-auto border rounded p-3 mb-3">
        {messages?.length === 0 && <p className="text-center text-muted">No messages yet</p>}
        {messages?.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "text-end" : "text-start"}>
            <div className="mb-2">
              <strong>{msg.role}</strong>: {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button className="btn btn-primary" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}
