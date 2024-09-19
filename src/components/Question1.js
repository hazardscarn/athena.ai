import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion';

const Question1 = ({ onNext, previousAnswers }) => {
    const [formData, setFormData] = useState({
      currentPosition: '',
      currentField: '',
      age: '',
      gender: '',
      maritalStatus: '',
      education: '',
      workExperience: '',
      resume: null,
    });

  useEffect(() => {
    if (previousAnswers && previousAnswers.q1) {
      setFormData(previousAnswers.q1);
    }
  }, [previousAnswers]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formDataToSubmit = { ...formData };
    if (e.target.resume.files && e.target.resume.files[0]) {
      formDataToSubmit.resume = e.target.resume.files[0];
    } else {
      delete formDataToSubmit.resume;  // Remove the resume field if no file was uploaded
    }
    console.log("Submitting form data:", formDataToSubmit);
    onNext({ q1: formDataToSubmit });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-3xl font-bold mb-6 text-indigo-700">Personal Information</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currentPosition">
              Current Position
            </label>
            <input
              type="text"
              id="currentPosition"
              name="currentPosition"
              value={formData.currentPosition}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currentField">
              Current Field of Work
            </label>
            <input
              type="text"
              id="currentField"
              name="currentField"
              value={formData.currentField}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="age">
              Age
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="maritalStatus">
              Marital Status
            </label>
            <select
              id="maritalStatus"
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select Marital Status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="education">
              Education
            </label>
            <input
              type="text"
              id="education"
              name="education"
              value={formData.education}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </motion.div>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="workExperience">
            Work Experience
          </label>
          <input
            type="text"
            id="workExperience"
            name="workExperience"
            value={formData.workExperience}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="resume">
            Upload Resume (optional)
          </label>
          <input
            type="file"
            id="resume"
            name="resume"
            onChange={handleChange}
            accept=".pdf,.doc,.docx"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </motion.div>
        <motion.button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Next
        </motion.button>
      </form>
    </motion.div>
  );
};

export default Question1;