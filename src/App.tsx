import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Bot, Send, User, Loader2, Sparkles, Plus, MessageSquare, Trash2, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { twMerge } from 'tailwind-merge';

const genAI = new GoogleGenerativeAI('AIzaSyCuynAsF9les34Mj5Pqg0sD3yR9dlOjkCQ');

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

function App() {
  const [chats, setChats] = useState<Chat[]>(() => {
    const savedChats = localStorage.getItem('chats');
    return savedChats ? JSON.parse(savedChats) : [];
  });
  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    return chats.length > 0 ? chats[0].id : '';
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find(chat => chat.id === currentChatId);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(chats[1]?.id || '');
    }
  };

  const updateChatTitle = (chatId: string, firstMessage: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          title: firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '')
        };
      }
      return chat;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!currentChatId) {
      createNewChat();
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      id: Date.now().toString()
    };

    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        const updatedMessages = [...chat.messages, userMessage];
        return {
          ...chat,
          messages: updatedMessages,
          title: chat.messages.length === 0 ? input.slice(0, 30) + (input.length > 30 ? '...' : '') : chat.title
        };
      }
      return chat;
    }));

    setInput('');
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash-001-tuning" });
      const chat = model.startChat({
        history: currentChat?.messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: msg.content,
        })) || []
      });
      
      const result = await chat.sendMessage(input);
      const response = await result.response;
      const text = response.text();

      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, {
              role: 'assistant',
              content: text,
              id: Date.now().toString()
            }]
          };
        }
        return chat;
      }));
    } catch (error) {
      console.error('Error:', error);
      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, {
              role: 'assistant',
              content: 'I apologize, but I encountered an error. Please try again.',
              id: Date.now().toString()
            }]
          };
        }
        return chat;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-[#0A0F1C] via-[#121A2D] to-[#0A0F1C]">
      {/* Sidebar */}
      <div className={twMerge(
        "fixed inset-y-0 left-0 w-80 glass-effect transform transition-transform duration-300 z-20",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4">
            <button
              onClick={createNewChat}
              className="sidebar-button group"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
              <span>New Chat</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
            {chats.map(chat => (
              <div key={chat.id} className="relative group">
                <button
                  onClick={() => setCurrentChatId(chat.id)}
                  className={twMerge(
                    "chat-item",
                    currentChatId === chat.id && "active"
                  )}
                >
                  <MessageSquare className="w-5 h-5 text-blue-400/70" />
                  <span className="flex-1 truncate text-left">{chat.title}</span>
                </button>
                <button
                  onClick={() => deleteChat(chat.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                           p-2 rounded-lg hover:bg-red-500/20 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={twMerge(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarOpen && "ml-80"
      )}>
        {/* Header */}
        <header className="glass-effect border-b border-white/[0.05]">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/5 transition-all duration-200
                         hover:shadow-[0_4px_12px_-1px_rgba(59,130,246,0.2)]"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20
                            shadow-[0_4px_12px_-1px_rgba(59,130,246,0.3)]">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold header-gradient bg-clip-text text-transparent
                           drop-shadow-[0_2px_4px_rgba(59,130,246,0.4)]">
                Mentii
              </h1>
            </div>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col p-6">
            <div className="flex-1 rounded-2xl glass-effect futuristic-gradient p-6 mb-6 overflow-y-auto custom-scrollbar">
              {!currentChat || currentChat.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20
                                shadow-[0_4px_12px_-1px_rgba(59,130,246,0.3)] mb-6">
                    <Bot className="w-16 h-16 text-blue-400" />
                  </div>
                  <p className="text-2xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    How can I assist you today?
                  </p>
                  <p className="text-sm mt-2 text-gray-500">Ask me anything, I'm here to help!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-3 message-transition ${
                        message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse space-x-reverse'
                      }`}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-full message-icon ${
                        message.role === 'assistant' 
                          ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20' 
                          : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                      }`}>
                        {message.role === 'assistant' ? (
                          <Bot className="w-5 h-5 text-blue-400" />
                        ) : (
                          <User className="w-5 h-5 text-purple-400" />
                        )}
                      </div>
                      <div className={`flex-1 message-bubble ${
                        message.role === 'assistant' ? 'assistant-message' : 'user-message'
                      }`}>
                        <div className="prose prose-invert max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isLoading && (
                <div className="flex items-center space-x-3 mt-6">
                  <div className="p-2 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 message-icon">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                  <div className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-gray-400 loading-gradient">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-6 py-4 rounded-2xl glass-effect border border-white/[0.05] 
                         text-white placeholder-gray-400 focus:outline-none input-glow
                         transition-all duration-300"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl 
                         bg-gradient-to-r from-blue-500 to-blue-600
                         hover:from-blue-400 hover:to-blue-500
                         disabled:opacity-50 disabled:hover:from-blue-500 disabled:hover:to-blue-600
                         transition-all duration-300 text-white
                         shadow-[0_4px_12px_-1px_rgba(59,130,246,0.3)]
                         hover:shadow-[0_4px_16px_-1px_rgba(59,130,246,0.4)]"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;