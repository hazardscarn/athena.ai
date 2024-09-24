import React from 'react';
import { motion } from 'framer-motion';
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
      {/* <h2 className="text-3xl font-bold mb-6 text-indigo-700">Career Compass</h2> */}
      
      {planCreationStatus === 'idle' && (
        <>
          <p className="text-xl text-gray-700 mb-6">You're ready to generate your personalized career plan.</p>
          <button
            onClick={onRequestPlan}
            className="bg-green-600 text-white px-6 py-3 rounded-lg text-xl hover:bg-green-700 transition-colors"
          >
            Generate Career Plan
          </button>
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

export default CareerCompass;