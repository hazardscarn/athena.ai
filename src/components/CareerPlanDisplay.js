// components/CareerPlanDisplay.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY,
    {
      db: { schema: 'public' },
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }
  );
const CareerPlanDisplay = ({ userId }) => {
  const [themes, setThemes] = useState({});
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(1);

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        setLoading(true);
        
        // Fetch theme data
        const { data: themeData, error: themeError } = await supabase
          .from('user_plan_theme')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (themeError) throw themeError;

        // Fetch task data
        const { data: taskData, error: taskError } = await supabase
          .from('user_plan_taskoutline')
          .select('*')
          .eq('user_id', userId);

        if (taskError) throw taskError;

        // Process the data
        setThemes(themeData);
        const processedTasks = taskData.reduce((acc, task) => {
          if (!acc[task.month]) acc[task.month] = [];
          acc[task.month].push(task.task_outline);
          return acc;
        }, {});
        setTasks(processedTasks);

      } catch (err) {
        console.error('Error fetching plan data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanData();
  }, [userId]);

  if (loading) return <div>Loading your career plan...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-indigo-700">Your Career Plan</h2>
      
      <div className="flex mb-6 overflow-x-auto">
        {Object.keys(themes).filter(key => key.startsWith('month_')).map((month, index) => (
          <motion.button
            key={month}
            onClick={() => setSelectedMonth(index + 1)}
            className={`px-4 py-2 mr-2 rounded-lg ${selectedMonth === index + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Month {index + 1}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMonth}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h3 className="text-2xl font-semibold mb-4 text-indigo-600">Month {selectedMonth} Theme:</h3>
          <p className="text-xl mb-6">{themes[`month_${selectedMonth}`]}</p>
          
          <h4 className="text-xl font-semibold mb-4 text-indigo-600">Tasks:</h4>
          <ul className="list-disc pl-6">
            {tasks[selectedMonth]?.map((task, index) => (
              <motion.li 
                key={index} 
                className="text-lg mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {task}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CareerPlanDisplay;