import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [resultId, setResultIdState] = useState(null);
  const [cvLabel, setCvLabel] = useState('');
  const [jdTitle, setJdTitle] = useState('');

  const setResultId = (value) => {
    setResultIdState(value);
    if (!value) {
      setCvLabel('');
      setJdTitle('');
    }
  };

  const setChatContext = ({ resultId: nextResultId = null, cvLabel: nextCvLabel = '', jdTitle: nextJdTitle = '' }) => {
    setResultIdState(nextResultId);
    setCvLabel(nextCvLabel || '');
    setJdTitle(nextJdTitle || '');
  };

  return (
    <ChatContext.Provider value={{ resultId, setResultId, cvLabel, jdTitle, setChatContext }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}