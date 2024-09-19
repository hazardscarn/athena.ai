// components/PlanCreationLoading.js
import React from 'react';
import { motion } from 'framer-motion';

const PlanCreationLoading = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold mb-6 text-indigo-700">Creating Your Career Plan</h2>
      <motion.div
        animate={{
          scale: [1, 2, 2, 1, 1],
          rotate: [0, 0, 270, 270, 0],
          borderRadius: ["20%", "20%", "50%", "50%", "20%"],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          times: [0, 0.2, 0.5, 0.8, 1],
          repeat: Infinity,
          repeatDelay: 1
        }}
        className="w-16 h-16 bg-blue-500"
      />
      <p className="mt-6 text-xl text-gray-700">Please wait while we generate your personalized career plan...</p>
    </div>
  );
};

export default PlanCreationLoading;