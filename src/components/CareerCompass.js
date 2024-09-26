import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Target, CheckSquare, ArrowRight } from 'lucide-react';
import CareerPlanDisplay from './CareerPlanDisplay';
import PlanCreationProgress from './PlanCreationProgress';

const CareerCompass = ({ userId, planCreationStatus, onRequestPlan }) => {
  return (
    <motion.div
      key="career-compass"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-lg p-8 text-center"
    >
      {/* <h2 className="text-3xl font-bold mb-6 text-indigo-700">Career Compass AI</h2> */}
      
      {planCreationStatus === 'idle' && (
        <>
          <p className="text-xl text-gray-700 mb-6">You're ready to generate your personalized career plan.</p>
          
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
            <h3 className="text-2xl font-semibold text-indigo-700 mb-4">How It Works</h3>
            <ol className="list-decimal list-inside space-y-2 text-indigo-900 text-left">
              <li>We've gathered your current career status and details</li>
              <li>You've defined your career goals for the next 12 months</li>
              <li>Our AI will generate your personalized career plan</li>
              <li>You'll be able to follow the plan, track your progress, and achieve your goals</li>
            </ol>
          </div>

          <motion.button
            onClick={onRequestPlan}
            className="bg-green-600 text-white px-8 py-3 rounded-full text-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Generate Career Plan <ArrowRight className="ml-2" />
          </motion.button>
        </>
      )}

      {planCreationStatus === 'loading' && (
        <PlanCreationProgress userId={userId} />
      )}

      {planCreationStatus === 'completed' && (
        <CareerPlanDisplay userId={userId} />
      )}
    </motion.div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-indigo-50 rounded-lg p-6 text-center">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-indigo-700 mb-2">{title}</h3>
    <p className="text-indigo-900">{description}</p>
  </div>
);

export default CareerCompass;