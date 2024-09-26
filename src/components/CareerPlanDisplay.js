import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, Circle, MinusCircle, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import JakeChatbot from './JakeChatbot';

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
  const [expandedTasks, setExpandedTasks] = useState({});
  const [progress, setProgress] = useState(0);
  const [userInfo, setUserInfo] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        setLoading(true);
        
        const [themeResponse, taskResponse, userInfoResponse] = await Promise.all([
          supabase.from('user_plan_theme').select('*').eq('user_id', userId).single(),
          supabase.from('user_plan_taskoutline').select('*').eq('user_id', userId),
          supabase.from('user_info').select('q2').eq('user_id', userId).single()
        ]);

        if (themeResponse.error) throw themeResponse.error;
        if (taskResponse.error) throw taskResponse.error;
        if (userInfoResponse.error) throw userInfoResponse.error;

        setThemes(themeResponse.data);
        const processedTasks = taskResponse.data.reduce((acc, task) => {
          if (!acc[task.month]) acc[task.month] = [];
          acc[task.month].push(task);
          return acc;
        }, {});
        setTasks(processedTasks);
        setUserInfo(userInfoResponse.data);

        calculateProgress(taskResponse.data);

      } catch (err) {
        console.error('Error fetching plan data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanData();
  }, [userId]);

  const calculateProgress = (taskData) => {
    const completedTasks = taskData.filter(task => task.status === 2).length;
    const totalTasks = taskData.length;
    const progressPercentage = (completedTasks / totalTasks) * 100;
    setProgress(progressPercentage);
  };

  const updateTaskStatus = async (month, taskIndex, newStatus) => {
    const task = tasks[month][taskIndex];
    const statusMap = { 'not_started': 0, 'in_progress': 1, 'completed': 2 };
    const newStatusValue = statusMap[newStatus];
  
    try {
      const { error } = await supabase  // Remove 'data' from here
        .from('user_plan_taskoutline')
        .update({ status: newStatusValue })
        .eq('id', task.id);
  
      if (error) throw error;
  
      setTasks(prevTasks => {
        const updatedTasks = { ...prevTasks };
        updatedTasks[month][taskIndex].status = newStatusValue;
        return updatedTasks;
      });
  
      // Recalculate progress
      const allTasks = Object.values(tasks).flat();
      calculateProgress(allTasks);
  
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 2:
        return 'border-green-500 bg-green-50';
      case 1:
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const parseTaskOutline = (taskOutline) => {
    const parts = taskOutline.split('**');
    const heading = parts[1].trim();
    let content = parts.slice(2).join('**').trim();
    
    // Replace '-' with '•' for bullet points and ensure they start on a new line
    content = content.replace(/\n\s*-\s*/g, '\n\n• ');
    
    const timeFrameMatch = content.match(/\(Expected time frame:.*?\)/);
    const timeFrame = timeFrameMatch ? timeFrameMatch[0] : '';
    const mainContent = content.replace(timeFrame, '').trim();
    
    return { heading, content: mainContent, timeFrame };
  };

  const TaskItem = ({ task, index }) => {
    const isExpanded = expandedTasks[task.id];
    const { heading, content, timeFrame } = parseTaskOutline(task.task_outline);

    return (
      <motion.div 
        className={`border rounded-lg shadow-sm overflow-hidden mb-4 ${getStatusStyle(task.status)}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <div 
          className="flex items-center justify-between p-4 cursor-pointer bg-white" 
          onClick={() => toggleTaskExpansion(task.id)}
        >
          <h5 className="text-lg font-semibold text-indigo-700 text-left">{heading}</h5>
          <div className="flex items-center">
            <span className="mr-2 text-sm font-medium text-gray-500">
              {task.status === 2 ? 'Completed' : task.status === 1 ? 'In Progress' : 'Not Started'}
            </span>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="px-4 pb-4 text-left"
            >
            <ReactMarkdown 
                className="prose max-w-none"
                rehypePlugins={[rehypeRaw]}
                components={{
                    p: ({node, ...props}) => <p className="mb-2 text-left" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1 text-left" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-left" {...props} />,
                    li: ({node, children, ...props}) => {
                    return <li className="mb-1 text-left" {...props}>{children}</li>;
                    },
                    a: ({node, children, ...props}) => (
                    <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
                        {children}
                    </a>
                    ),
                    strong: ({node, ...props}) => <strong className="font-semibold text-indigo-700" {...props} />
                }}
                >
                {content}
            </ReactMarkdown>
              <p className="text-sm text-gray-600 mt-2">{timeFrame}</p>
              <div className="flex justify-end mt-4 space-x-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTaskStatus(selectedMonth, index, 'completed');
                  }}
                  className={`p-2 rounded-full ${task.status === 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}`}
                  title="Mark as Completed"
                >
                  <CheckCircle size={20} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTaskStatus(selectedMonth, index, 'in_progress');
                  }}
                  className={`p-2 rounded-full ${task.status === 1 ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-yellow-100'}`}
                  title="Mark as In Progress"
                >
                  <MinusCircle size={20} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTaskStatus(selectedMonth, index, 'not_started');
                  }}
                  className={`p-2 rounded-full ${task.status === 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}`}
                  title="Mark as Not Started"
                >
                  <Circle size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const ProgressTracker = ({ progress, userInfo }) => {
    return (
      <div className="mt-8 bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-2xl font-bold text-indigo-700 mb-4">Your Progress</h3>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                Task Completion
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-indigo-600">
                {progress.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
            <div style={{ width: `${progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Circle className="text-indigo-500 mr-2" size={24} />
              <span className="text-sm font-medium text-gray-700">Start</span>
            </div>
            <div className="flex items-center relative">
              <span className="text-sm font-medium text-gray-700 mr-2">Finish</span>
              <div
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="relative"
              >
                <Flag className="text-indigo-500" size={24} />
                {showTooltip && userInfo && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-800 text-white text-sm rounded shadow-lg w-64 z-10">
                    {userInfo.q2}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center text-2xl text-indigo-600">Loading your career plan...</div>;
  if (error) return <div className="text-center text-2xl text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-2xl p-4 sm:p-8">
      <h2 className="text-4xl font-bold text-center text-white mb-6">Career Compass AI</h2>
      <div className="flex flex-wrap justify-center mb-6 gap-2">
        {Object.keys(themes).filter(key => key.startsWith('month_')).map((month, index) => (
          <motion.button
            key={month}
            onClick={() => setSelectedMonth(index + 1)}
            className={`px-4 py-2 rounded-full text-sm sm:text-base font-semibold transition-all ${
              selectedMonth === index + 1 
                ? 'bg-white text-indigo-700 shadow-lg' 
                : 'bg-indigo-200 text-indigo-700 hover:bg-indigo-300'
            }`}
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
          className="bg-white text-indigo-900 rounded-xl shadow-inner p-4 sm:p-6"
        >
          <div className="mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-indigo-700 text-center">
              Theme: {' '}
              <span className="text-indigo-600 font-normal">
                <ReactMarkdown components={{
                  p: ({node, ...props}) => <span {...props} />
                }}>
                  {themes[`month_${selectedMonth}`] || ''}
                </ReactMarkdown>
              </span>
            </h3>
          </div>
          
          <div>
            <h4 className="text-lg sm:text-xl font-semibold mb-4 text-indigo-600 text-center">This month's tasks:</h4>
            <div className="space-y-4">
              {tasks[selectedMonth]?.map((task, index) => (
                <TaskItem key={task.id || index} task={task} index={index} />
              ))}
            </div>
            </div>
        </motion.div>
      </AnimatePresence>

      <ProgressTracker progress={progress} userInfo={userInfo} />
      <JakeChatbot />
    </div>
  );
};

export default CareerPlanDisplay;