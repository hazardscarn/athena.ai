import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Question4 = ({ onNext, previousAnswers }) => {
  const [answer, setAnswer] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isValidWordCount, setIsValidWordCount] = useState(false);

  useEffect(() => {
    if (previousAnswers && previousAnswers.q4) {
      setAnswer(String(previousAnswers.q4));
    }
  }, [previousAnswers]);

  useEffect(() => {
    const words = answer.trim().split(/\s+/);
    const count = answer.trim() === '' ? 0 : words.length;
    setWordCount(count);
    setIsValidWordCount(count >= 10 && count <= 200);
  }, [answer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValidWordCount) {
      console.log("Question4 handleSubmit called");
      console.log("Submitting answer for q4:", answer);
      onNext({ q4: answer });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-3xl font-bold mb-6 text-indigo-700">Additional Information</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="additionalInfo">
            Is there anything else you'd like to mention about yourself or your career goals? (10-200 words)
          </label>
          <textarea
            id="additionalInfo"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows="6"
            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              !isValidWordCount && wordCount > 0 ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
        </motion.div>
        <div className={`text-sm ${isValidWordCount ? 'text-green-600' : 'text-red-600'}`}>
          Word count: {wordCount} {!isValidWordCount && '(10-200 words required)'}
        </div>
        <motion.button
          type="submit"
          className={`w-full text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out ${
            isValidWordCount
              ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          whileHover={isValidWordCount ? { scale: 1.05 } : {}}
          whileTap={isValidWordCount ? { scale: 0.95 } : {}}
          disabled={!isValidWordCount}
        >
          Submit
        </motion.button>
      </form>
    </motion.div>
  );
};

export default Question4;