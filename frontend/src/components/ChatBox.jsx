import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useChatContext } from '../contexts/ChatContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Icon bong bong chat
function ChatIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

// Mot bong bong tin nhan
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-black/10 text-gray-800 rounded-bl-sm shadow-sm'
        }`}
      >
        {isUser ? (
          msg.content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0">{children}</ol>,
              li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {msg.content || ''}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

// Hieu ung dang go
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2 flex-shrink-0">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="bg-white border border-black/10 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
        <div className="flex gap-1 items-center">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

const QUICK_QUESTIONS = [
  'Tôi cần cải thiện điều gì nhất?',
  'Điểm kỹ năng thấp là do thiếu gì?',
  'Làm thế nào để viết CV tốt hơn?',
  'JD này yêu cầu những gì quan trọng nhất?',
];

export default function ChatBox() {
  const { user } = useAuth();
  const { resultId, cvLabel, jdTitle, setResultId } = useChatContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: resultId
        ? 'Xin chào! Tôi đã đọc kết quả phân tích CV của bạn. Bạn muốn hỏi gì về kết quả này, hoặc cần tư vấn thêm về CV không?'
        : 'Xin chào! Tôi là trợ lý tư vấn CV. Bạn có thể hỏi tôi về cách viết CV, cải thiện hồ sơ, hoặc bất cứ điều gì liên quan đến tuyển dụng nhé!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Tu cuon xuong cuoi khi co tin nhan moi
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input khi mo chat
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasUnread(false);
    }
  }, [isOpen]);

  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMsg = { role: 'user', content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = newMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.post('/chat/', {
        message: messageText,
        history,
        result_id: resultId || null,
      });

      const assistantMsg = {
        role: 'assistant',
        content: response.data.reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Neu chat dang dong -> danh dau co tin nhan chua doc
      if (!isOpen) setHasUnread(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    // Reset ve che do tu van chung khi nguoi dung bam Xoa
    setResultId(null);
    setMessages([
      {
        role: 'assistant',
        content: 'Đã xóa lịch sử. Tôi có thể giúp gì cho bạn?',
      },
    ]);
  };

  // Khong hien thi neu chua dang nhap
  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Cua so chat */}
      {isOpen && (
        <div className="w-[360px] h-[520px] bg-white rounded-2xl shadow-2xl border border-black/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <ChatIcon />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Trợ lý CV AI</p>
                {resultId ? (
                  <>
                    <p className="text-blue-100 text-xs">Đang đọc ngữ cảnh phân tích</p>
                    <p className="text-blue-100/90 text-[11px] max-w-[240px] truncate" title={`CV: ${cvLabel || 'Không rõ'} | JD: ${jdTitle || 'Không rõ'}`}>
                      CV: {cvLabel || 'Không rõ'} | JD: {jdTitle || 'Không rõ'}
                    </p>
                  </>
                ) : (
                  <p className="text-blue-100 text-xs">Tư vấn CV chung</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                title="Xóa lịch sử"
                className="text-white/70 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                Xóa
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Danh sach tin nhan */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 modern-scrollbar">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Cau hoi nhanh - chi hien thi khi chua co cuoc tro chuyen nhieu */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 py-2 bg-gray-50 border-t border-black/5 flex-shrink-0">
              <p className="text-xs text-gray-500 mb-2">Câu hỏi gợi ý:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full hover:bg-blue-50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* O nhap lieu */}
          <div className="px-3 py-3 border-t border-black/5 bg-white flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi... (Enter để gửi)"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50 max-h-28 overflow-y-auto modern-scrollbar"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">Shift+Enter để xuống dòng</p>
          </div>
        </div>
      )}

      {/* Nut bubble */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 relative"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <ChatIcon />
        )}

        {/* Cham do bao tin nhan chua doc */}
        {hasUnread && !isOpen && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  );
}
