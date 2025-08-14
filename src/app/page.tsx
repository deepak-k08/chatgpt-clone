"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button, Form, Container, Card, Row, Col, Spinner } from "react-bootstrap";
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const [messages, setMessages] = useState<{ role: string; content: string; timestamp?: Date; isStreaming?: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    const userMessage = { 
      role: "user", 
      content: input, 
      timestamp: new Date() 
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    // Add empty AI message that will be streamed
    const aiMessageIndex = messages.length + 1;
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true
    }]);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          sessionId: sessionId
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let streamedContent = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.error) {
                  setMessages((prev) => 
                    prev.map((msg, index) => 
                      index === aiMessageIndex 
                        ? { ...msg, content: data.error, isStreaming: false }
                        : msg
                    )
                  );
                  break;
                }

                if (data.done) {
                  setMessages((prev) => 
                    prev.map((msg, index) => 
                      index === aiMessageIndex 
                        ? { ...msg, isStreaming: false }
                        : msg
                    )
                  );
                  break;
                }

                if (data.chunk) {
                  streamedContent += data.chunk;
                  setMessages((prev) => 
                    prev.map((msg, index) => 
                      index === aiMessageIndex 
                        ? { ...msg, content: streamedContent }
                        : msg
                    )
                  );
                }
              } catch (parseError) {
                console.error('Error parsing chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error("Error sending message:", error);
      
      if (typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }

      setMessages((prev) => 
        prev.map((msg, index) => 
          index === aiMessageIndex 
            ? { 
                ...msg, 
                content: "Sorry, there was an error sending your message. Please try again.",
                isStreaming: false
              }
            : msg
        )
      );
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp?: Date) => {
    if (!timestamp) return "";
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setIsSending(false);
  };

  return (
    <div className="vh-100 d-flex flex-column" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div className="border-bottom bg-white shadow-sm">
        <Container fluid>
          <Row className="align-items-center py-3">
            <Col>
              <h4 className="mb-0 text-primary">
                <i className="bi bi-chat-dots me-2"></i>
                ChatGPT Clone
              </h4>
            </Col>
            <Col xs="auto" className="d-flex gap-2">
              {isSending && (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={stopGeneration}
                >
                  <i className="bi bi-stop-fill me-1"></i>
                  Stop
                </Button>
              )}
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={clearChat}
                disabled={messages.length === 0}
              >
                <i className="bi bi-trash me-1"></i>
                Clear
              </Button>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Messages Container */}
      <div className="flex-grow-1 overflow-hidden">
        <Container fluid className="h-100 py-3">
          <div 
            className="h-100 overflow-auto pe-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {messages.length === 0 ? (
              <div className="d-flex align-items-center justify-content-center h-100">
                <div className="text-center text-muted">
                  <i className="bi bi-chat-text display-1 mb-3"></i>
                  <h5>Start a conversation</h5>
                  <p>Type a message below to get started!</p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="mb-4">
                  <div className={`d-flex ${msg.role === "user" ? "justify-content-end" : "justify-content-start"}`}>
                    <div className={`position-relative ${msg.role === "user" ? "ms-5" : "me-5"}`} style={{ maxWidth: '80%' }}>
                      {/* Avatar */}
                      <div className={`d-flex align-items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div 
                          className={`rounded-circle d-flex align-items-center justify-content-center text-white me-2 ms-2 ${
                            msg.role === "user" 
                              ? "bg-primary" 
                              : msg.role === "assistant" 
                                ? "bg-success" 
                                : "bg-warning"
                          }`}
                          style={{ width: '32px', height: '32px', fontSize: '14px' }}
                        >
                          {msg.role === "user" ? "U" : msg.role === "assistant" ? "AI" : "!"}
                        </div>
                        
                        {/* Message Bubble */}
                        <Card 
                          className={`border-0 shadow-sm ${
                            msg.role === "user" 
                              ? "bg-primary text-white" 
                              : "bg-white"
                          }`}
                          style={{ 
                            borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px"
                          }}
                        >
                          <Card.Body className="p-3">
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {msg.content}
                              {msg.isStreaming && (
                                <span className="streaming-cursor">|</span>
                              )}
                            </div>
                            {msg.timestamp && !msg.isStreaming && (
                              <small 
                                className={`d-block mt-2 ${
                                  msg.role === "user" ? "text-white-50" : "text-muted"
                                }`}
                                style={{ fontSize: '0.75rem' }}
                              >
                                {formatTime(msg.timestamp)}
                              </small>
                            )}
                          </Card.Body>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </Container>
      </div>

      {/* Input Area */}
      <div className="border-top bg-white shadow">
        <Container fluid>
          <div className="py-3">
            <Form onSubmit={(e) => e.preventDefault()}>
              <Row className="align-items-end g-2">
                <Col>
                  <Form.Group>
                    <Form.Control
                      as="textarea"
                      rows={1}
                      placeholder="Type your message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={isSending}
                      style={{ 
                        resize: 'none',
                        minHeight: '44px',
                        maxHeight: '120px',
                        borderRadius: '22px',
                        paddingLeft: '16px',
                        paddingRight: '16px'
                      }}
                      className="shadow-sm"
                    />
                  </Form.Group>
                </Col>
                <Col xs="auto">
                  <Button 
                    variant="primary" 
                    onClick={sendMessage} 
                    disabled={isSending || !input.trim()}
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '44px', height: '44px' }}
                    title="Send message"
                  >
                    {isSending ? (
                      <Spinner size="sm" />
                    ) : (
                      <i className="bi bi-send-fill"></i>
                    )}
                  </Button>
                </Col>
              </Row>
            </Form>
          </div>
        </Container>
      </div>
    </div>
  );
}
