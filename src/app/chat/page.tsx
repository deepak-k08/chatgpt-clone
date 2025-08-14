// File path: src/app/chat/page.tsx

"use client";

import React, { useState, useRef } from "react";
import { Button, Form } from "react-bootstrap";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("/api/trpc/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      if (data?.assistant) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.assistant }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="container py-4">
      <div className="border rounded p-3 mb-3" style={{ height: "70vh", overflowY: "auto" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 ${msg.role === "user" ? "text-primary" : "text-success"}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <Form className="d-flex gap-2" onSubmit={(e) => e.preventDefault()}>
        <Form.Control
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isSending}
        />
        <Button variant="primary" onClick={sendMessage} disabled={isSending}>
          {isSending ? "Sending..." : "Send"}
        </Button>
      </Form>
    </div>
  );
}
