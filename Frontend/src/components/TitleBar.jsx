import React from 'react';
import { Github } from 'lucide-react';

export default function TitleBar({ theme }) {
  return (
    <div className={`${
      theme === 'vista'
        ? 'bg-gradient-to-b from-gray-800 to-gray-900 px-4 py-3 border-b border-gray-700'
        : 'bg-white px-4 py-2 border-b-2 border-black relative overflow-hidden'
    }`}>
      {theme === 'mac' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)'
        }}></div>
      )}
      <div className={`flex items-center relative z-10 ${theme === 'mac' ? 'justify-between' : 'gap-3'}`}>
        <div className="flex gap-1.5">
          <div className={`w-3 h-3 ${theme === 'vista' ? 'rounded-full bg-red-500 border border-red-600' : 'bg-white border-2 border-black'}`}></div>
          <div className={`w-3 h-3 ${theme === 'vista' ? 'rounded-full bg-yellow-500 border border-yellow-600' : 'hidden'}`}></div>
          <div className={`w-3 h-3 ${theme === 'vista' ? 'rounded-full bg-green-500 border border-green-600' : 'hidden'}`}></div>
        </div>
        <h1 className={`${theme === 'vista' ? 'font-semibold text-sm tracking-wide text-white flex-1' : 'font-bold text-xs tracking-tight text-black text-center flex-1'} select-none`}>
          PhyVista v2.0
        </h1>
        <a
          href="https://github.com/thattimelessman/PhyVista"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          className={`${
            theme === 'vista'
              ? 'text-gray-300 hover:text-white transition-colors'
              : 'text-black hover:text-gray-600 transition-colors'
          }`}
        >
          <Github size={theme === 'vista' ? 16 : 14} />
        </a>
        {theme === 'mac' && <div className="w-3"></div>}
      </div>
    </div>
  );
}