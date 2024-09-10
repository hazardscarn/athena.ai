import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import SignInUp from './components/SignInUp';
import HomePage from './components/HomePage';
import Question1 from './components/Question1';
import Question2 from './components/Question2';
import Question3 from './components/Question3';
import Question4 from './components/Question4';


// Use environment variables to create Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }
);

const App = () => {
  const [user, setUser] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [currentStep, setCurrentStep] = useState('home');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserStatus = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_status')
        .select('status')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User status not found, create a new entry
          await createUserStatus(userId);
        } else {
          throw error;
        }
      } else {
        setUserStatus(data.status);
      }
    } catch (err) {
      console.error("Error fetching/setting user status:", err);
      setError(err.message);
    }
  }, []);

  const createUserStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_status')
        .insert({ user_id: userId, status: 0 })
        .select()
        .single();

      if (error) throw error;

      setUserStatus(data.status);
    } catch (err) {
      console.error("Error creating user status:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          setUser(session.user);
          await fetchUserStatus(session.user.id);
        } else {
          setUser(null);
          setUserStatus(null);
        }
      } catch (err) {
        console.error("Error checking session:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserStatus(session.user.id);
      } else {
        setUser(null);
        setUserStatus(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserStatus]);

  const startCareerPlanning = () => {
    setCurrentStep('q1');
  };

  const handleNext = async (stepData) => {
    try {
      let newAnswers = { ...answers };
  
      console.log("Received stepData in handleNext:", stepData);
  
      if (currentStep === 'q1') {
        // Extract the q1 data from the stepData
        const q1Data = stepData.q1;
  
        // Validate required fields
        const requiredFields = ['age', 'currentField', 'currentPosition', 'gender', 'maritalStatus', 'education', 'workExperience'];
        for (let field of requiredFields) {
          if (!q1Data[field] && q1Data[field] !== 0) {
            throw new Error(`${field} is required`);
          }
        }
  
        // Handle file upload for resume if needed
        let resumeUrl = null;
        if (q1Data.resume) {
          const fileExt = q1Data.resume.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(fileName, q1Data.resume);
  
          if (uploadError) throw uploadError;
  
          const { data: { publicUrl }, error: urlError } = supabase.storage
            .from('resumes')
            .getPublicUrl(fileName);
  
          if (urlError) throw urlError;
  
          resumeUrl = publicUrl;
        }
  
        newAnswers = {
          ...newAnswers,
          user_id: user.id,
          age: parseInt(q1Data.age),
          field_of_work: q1Data.currentField,
          current_position: q1Data.currentPosition,
          gender: q1Data.gender,
          marital_status: q1Data.maritalStatus,
          education: q1Data.education,
          work_experience: q1Data.workExperience,
          resume: resumeUrl,
        };
      } else if (currentStep === 'q2' || currentStep === 'q3' || currentStep === 'q4') {
        // Check if stepData is an object with the current step as a key
        const answer = stepData[currentStep] || stepData;
        
        if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
          throw new Error(`Answer for ${currentStep} is required`);
        }
        newAnswers[currentStep] = answer.trim();
      }
  
      setAnswers(newAnswers);
  
      const nextStep = currentStep === 'q1' ? 'q2' :
                       currentStep === 'q2' ? 'q3' :
                       currentStep === 'q3' ? 'q4' : 'finished';
  
      if (nextStep === 'finished') {
        const { error: upsertError } = await supabase
          .from('user_info')
          .upsert(newAnswers)
          .select();
  
        if (upsertError) throw upsertError;
  
        await updateUserStatus(1); // Update status to 1 after submitting all info
      }
  
      setCurrentStep(nextStep);
  
    } catch (error) {
      console.error('Error in handleNext:', error);
      setError(error.message);
    }
  };

  const handleBack = () => {
    const prevStep = currentStep === 'q2' ? 'q1' :
                     currentStep === 'q3' ? 'q2' :
                     currentStep === 'q4' ? 'q3' : 'home';
    setCurrentStep(prevStep);
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setUserStatus(null);
      setCurrentStep('home');
      setAnswers({});
    } catch (err) {
      console.error("Sign out error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('user_status')
        .update({ status: newStatus })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setUserStatus(newStatus);
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err.message);
    }
  };

  const requestCareerPlan = async () => {
    try {
      await updateUserStatus(2);
      alert('Your career plan request has been submitted. We will notify you when it\'s ready.');
    } catch (err) {
      console.error("Error requesting career plan:", err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    );
  }

  if (!user) {
    return <SignInUp setUser={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-8 relative">
      <motion.button
        className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
        onClick={handleSignOut}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Sign Out
      </motion.button>

      {currentStep !== 'home' && currentStep !== 'finished' && (
        <motion.button
          className="absolute top-4 left-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          onClick={handleBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Back
        </motion.button>
      )}

      <div className="max-w-4xl mx-auto mt-16">
        <AnimatePresence mode="wait">
          {userStatus === 0 && currentStep === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <HomePage startCareerPlanning={startCareerPlanning} />
            </motion.div>
          )}
          {currentStep !== 'home' && currentStep !== 'finished' && (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-lg p-8"
            >
              {currentStep === 'q1' && <Question1 onNext={handleNext} previousAnswers={answers} />}
              {currentStep === 'q2' && <Question2 onNext={handleNext} previousAnswers={answers.q2 || ''} />}
              {currentStep === 'q3' && <Question3 onNext={handleNext} previousAnswers={answers.q3 || ''} />}
              {currentStep === 'q4' && <Question4 onNext={handleNext} previousAnswers={answers.q4 || ''} />}
            </motion.div>
          )}
          {currentStep === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-lg p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-6 text-indigo-700">Thank You!</h2>
              <p className="text-xl text-gray-700">Your career planning information has been submitted successfully.</p>
            </motion.div>
          )}
          {userStatus === 1 && currentStep === 'home' && (
            <motion.div
              key="request-plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-lg p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-6 text-indigo-700">Information Submitted</h2>
              <p className="text-xl text-gray-700 mb-6">You're ready to request your personalized career plan.</p>
              <button
                onClick={requestCareerPlan}
                className="bg-green-600 text-white px-6 py-3 rounded-lg text-xl hover:bg-green-700 transition-colors"
              >
                Request Career Plan
              </button>
            </motion.div>
          )}
          {userStatus === 2 && currentStep === 'home' && (
            <motion.div
              key="view-plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-lg p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-6 text-indigo-700">Your Career Plan</h2>
              <p className="text-xl text-gray-700 mb-6">Here's your personalized career plan based on your information.</p>
              {/* Add more details or components for the career plan view here */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;