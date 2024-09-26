import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ChevronUp, ChevronDown, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const JakeChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);
  const toggleMinimize = () => setIsMinimized(!isMinimized);

  const handleInputChange = (e) => setInput(e.target.value);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.trim()) {
      const userMessage = { text: input, sender: 'user' };
      setMessages(prevMessages => [...prevMessages, userMessage]);
      setInput('');
      setIsProcessing(true);
      
      try {
        const conversationHistory = messages.slice(-9).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));
        
        conversationHistory.push({ role: 'user', content: input });
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              message: input,
              conversation_history: conversationHistory
            }),
          });
        
        const data = await response.json();
        const botMessage = { text: data.response, sender: 'jake' };
        setMessages(prevMessages => [...prevMessages, botMessage].slice(-20));
      } catch (error) {
        console.error('Error:', error);
        const errorMessage = { text: "Sorry, I couldn't process your request. Please try again later.", sender: 'jake' };
        setMessages(prevMessages => [...prevMessages, errorMessage].slice(-20));
      } finally {
        setIsProcessing(false);
      }
    }
  };


  const renderMessage = (message, index) => {
    const isUser = message.sender === 'user';
    return (
      <div key={index} className={`flex items-start mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center mr-2 flex-shrink-0">
            <MessageCircle size={20} className="text-white" />
          </div>
        )}
        <div className={`max-w-[75%] p-3 rounded-lg ${isUser ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
          <ReactMarkdown
            className="prose max-w-none text-left"
            rehypePlugins={[rehypeRaw]}
            components={{
              p: ({node, ...props}) => <p className="mb-2 text-left" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 text-left" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 text-left" {...props} />,
              li: ({node, ...props}) => <li className="mb-1 text-left" {...props} />,
              a: ({node, ...props}) => (
                <a
                  className="text-blue-600 hover:underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              code: ({node, inline, ...props}) => 
                inline 
                  ? <code className="bg-gray-100 rounded px-1 py-0.5" {...props} />
                  : <code className="block bg-gray-100 rounded p-2 my-2 whitespace-pre-wrap text-left" {...props} />,
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-2 text-left" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-2 text-left" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-2 text-left" {...props} />,
              h4: ({node, ...props}) => <h4 className="text-base font-bold mb-2 text-left" {...props} />,
              h5: ({node, ...props}) => <h5 className="text-sm font-bold mb-2 text-left" {...props} />,
              h6: ({node, ...props}) => <h6 className="text-xs font-bold mb-2 text-left" {...props} />,
              table: ({node, ...props}) => <table className="border-collapse border border-gray-300 my-2" {...props} />,
              th: ({node, ...props}) => <th className="border border-gray-300 px-4 py-2 bg-gray-100" {...props} />,
              td: ({node, ...props}) => <td className="border border-gray-300 px-4 py-2" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2" {...props} />,
              hr: ({node, ...props}) => <hr className="my-4 border-t border-gray-300" {...props} />,
              img: ({node, ...props}) => <img className="max-w-full h-auto my-2" {...props} />,
            }}
          >
            {message.text}
          </ReactMarkdown>
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center ml-2 flex-shrink-0">
            <User size={20} className="text-white" />
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50 sm:bottom-8 sm:right-8"
      animate={{ y: isOpen ? 0 : 10 }}
    >
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="bg-white rounded-lg shadow-xl w-80 sm:w-96 mb-4 overflow-hidden"
          >
            <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center">
                <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                Jake is online to assist you
              </h3>
              <button onClick={toggleMinimize} className="text-white hover:text-indigo-200">
                <ChevronDown size={24} />
              </button>
            </div>
            <div className="h-64 sm:h-80 overflow-y-auto p-4 bg-gray-100">
              {messages.map(renderMessage)}
              {isProcessing && (
                <div className="flex justify-center items-center py-2">
                  <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8 animate-spin"></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-4 bg-white">
              <div className="flex">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask about courses..."
                  className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="bg-indigo-600 text-white p-2 rounded-r-lg hover:bg-indigo-700">
                  <Send size={24} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {isOpen && isMinimized && (
        <motion.button
          onClick={toggleMinimize}
          className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 mb-4"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronUp size={24} />
        </motion.button>
      )}
      <motion.button
        onClick={toggleChat}
        className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>
    </motion.div>
  );
};

export default JakeChatbot;