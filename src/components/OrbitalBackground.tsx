import React from 'react';
import { motion } from 'framer-motion';
export function OrbitalBackground() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#070911]">
      <motion.svg className="w-full h-full opacity-20" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
        <motion.ellipse
          cx="500" cy="500" rx="400" ry="150"
          fill="none" stroke="#f59e0b" strokeWidth="0.5"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
        <motion.ellipse
          cx="500" cy="500" rx="300" ry="400"
          fill="none" stroke="#00e5ff" strokeWidth="0.5"
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M 100 500 Q 500 100 900 500"
          fill="none" stroke="#f59e0b" strokeWidth="0.2"
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <g className="opacity-10">
          <circle cx="500" cy="500" r="1" fill="#fff" />
          <circle cx="200" cy="300" r="0.5" fill="#fff" />
          <circle cx="800" cy="700" r="0.5" fill="#fff" />
          <circle cx="400" cy="800" r="0.5" fill="#fff" />
        </g>
      </motion.svg>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070911]/50 to-[#070911]" />
    </div>
  );
}