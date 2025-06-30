// src/components/agent.jsx or agent.tsx

import React from "react";

const Agent = ({ name, avatarSrc, isSpeaking, text }) => {
  return (
    <div
      className={`flex-1 flex flex-col items-center p-2 transition-shadow duration-300
        ${isSpeaking ? 'ring-4 ring-emerald-400 animate-pulse shadow-xl' : ''}`}
    >
      <div className="w-96 h-96 bg-gray-700 rounded-lg flex items-center justify-center mb-2 shadow-inner">
        <img
          src={avatarSrc || '/dummy-user.png'}
          alt={name}
          className="w-28 h-28 rounded-full object-cover"
        />
      </div>
      <span className="text-gray-200 mt-1 font-medium">{name}</span>

      {isSpeaking && text && (
        <div className="mt-2 text-white bg-black bg-opacity-50 px-4 py-2 rounded max-w-xs text-center">
          {text}
        </div>
      )}
    </div>
  );
};


export default Agent;
