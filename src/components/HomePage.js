import React from 'react';

const HomePage = ({ startCareerPlanning }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Welcome to Career Guidance</h1>
      <button
        onClick={startCareerPlanning}
        className="bg-green-500 text-white px-6 py-3 rounded-lg text-xl hover:bg-green-600 transition-colors"
      >
        Plan Your Career
      </button>
    </div>
  );
};

export default HomePage;