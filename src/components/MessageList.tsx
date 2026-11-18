import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../lib/types';

interface Props {
  messages: ChatMessage[];
}

export function MessageList({ messages }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return (
    <div className="messages" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((m) => (
        <div key={m.id} className={`bubble bubble--${m.role}`}>
          <span className="bubble__who">
            {m.role === 'ava' ? 'Ava' : m.role === 'user' ? 'You' : 'System'}
            {m.source === 'voice' ? ' · voice' : m.source === 'chip' ? ' · quick choice' : ''}
          </span>
          <p>{m.text}</p>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
