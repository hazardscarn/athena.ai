import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Target, CheckSquare, ArrowRight } from 'lucide-react';

const CareerCompassIntro = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <motion.div 
        className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-center text-indigo-700 mb-8">Welcome to Career Compass AI</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <FeatureCard 
            icon={<Cpu className="w-12 h-12 text-indigo-500" />}
            title="AI-Powered Planning"
            description="Our advanced AI analyzes your current status and future goals to create a tailored career plan."
          />
          <FeatureCard 
            icon={<Target className="w-12 h-12 text-indigo-500" />}
            title="12-Month Roadmap"
            description="Get a personalized 12-month career target plan with actionable tasks and milestones."
          />
          <FeatureCard 
            icon={<CheckSquare className="w-12 h-12 text-indigo-500" />}
            title="Progress Tracking"
            description="Track your progress and stay motivated as you work towards your career goals."
          />
        </div>

        <div className="bg-indigo-100 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-indigo-700 mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-indigo-900">
            <li>Enter your current career status and details</li>
            <li>Define where you want to be in 12 months</li>
            <li>Our AI generates your personalized career plan</li>
            <li>Follow the plan, track your progress, and achieve your goals</li>
            <li>Get help from your personalized AI assistant Jake at every step of your journey</li>
          </ol>
        </div>

        <div className="text-center">
          <motion.button
            onClick={onStart}
            className="bg-indigo-600 text-white px-8 py-3 rounded-full text-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Let's Go <ArrowRight className="ml-2" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-indigo-50 rounded-lg p-6 text-center">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-indigo-700 mb-2">{title}</h3>
    <p className="text-indigo-900">{description}</p>
  </div>
);

export default CareerCompassIntro;