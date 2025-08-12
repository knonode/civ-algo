import React, { useState } from 'react';
import './FocusChat.css';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

// Always same-origin in development to avoid CORS; use explicit base only in prod.
const API_BASE: string = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '');

export function FocusChat(): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a concise assistant for the Civ Counter app.' },
            ...messages.map(({ role, content }) => ({ role, content })),
            { role: 'user', content: trimmed },
          ],
        }),
      });
      const data = (await response.json().catch(() => ({}))) as unknown as { message?: string; error?: string };
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      const { message } = data as { message: string };
      const assistant: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: message,
      };
      setMessages((prev) => [...prev, assistant]);
    } catch (err) {
      const assistant: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `AI error: ${err instanceof Error ? err.message : String(err)}`,
      };
      setMessages((prev) => [...prev, assistant]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="focus-chat">
      <div className="focus-chat-messages">
        {messages.length === 0 ? (
          <div className="focus-chat-empty">Start a conversation…</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`focus-chat-message ${m.role}`}>
              <div className="role">{m.role === 'user' ? 'You' : 'AI'}</div>
              <div className="content">{m.content}</div>
            </div>
          ))
        )}
      </div>
      <form className="focus-chat-input" onSubmit={send}>
        <input
          type="text"
          placeholder="Type your message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
        />
        <button type="submit" disabled={isSending || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

export default FocusChat;


