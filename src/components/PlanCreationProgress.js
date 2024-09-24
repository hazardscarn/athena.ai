import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const PlanCreationProgress = ({ userId }) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Analyzing your career goals...');

  useEffect(() => {
    let isMounted = true;
    const checkPlanStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('user_plan_theme')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          if (isMounted) {
            setProgress(100);
          }
        } else {
          if (isMounted) {
            setTimeout(checkPlanStatus, 5000); // Check every 5 seconds
          }
        }
      } catch (err) {
        console.error("Error checking plan status:", err);
      }
    };

    const interval = setInterval(() => {
      if (isMounted) {
        setProgress((prevProgress) => {
          if (prevProgress >= 95) {
            return 95; // Cap at 95% until plan is actually ready
          }
          return prevProgress + 5;
        });
      }
    }, 3000);

    const messageInterval = setInterval(() => {
      if (isMounted) {
        setMessage(getRandomMessage());
      }
    }, 5000);

    checkPlanStatus();

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearInterval(messageInterval);
    };
  }, [userId]);

  const getRandomMessage = () => {
    const messages = [
      'Analyzing your career goals...',
      'Cross referencing your goals to skills...',
      'Drafting your personalized plan...',
      'Developing Monthly Themes...',
      'Crafting personalized strategies...',
      'Developing your career roadmap...',
      'Verifying plan with industry standards...',
      'Cross Validating plan with career targets...',
      'Finalizing your career roadmap...',
      'Saving your career plan...',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold mb-6 text-indigo-700">Creating Your Career Plan</h2>
      <motion.div
        className="w-64 h-6 bg-gray-200 rounded-full overflow-hidden"
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="h-full bg-green-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>
      <p className="mt-4 text-xl text-gray-700">{progress}% complete</p>
      <motion.p 
        className="mt-2 text-md text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        key={message}
      >
        {message}
      </motion.p>
    </div>
  );
};

export default PlanCreationProgress;