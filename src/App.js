import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import SignInUp from './components/SignInUp';
import HomePage from './components/HomePage';
import CareerCompass from './components/CareerCompass';
import Question1 from './components/Question1';
import Question2 from './components/Question2';
import Question3 from './components/Question3';
import Question4 from './components/Question4';
import CareerCompassIntro from './components/CareerCompassIntro';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    db: { schema: 'public' },
    auth: { 
      persistSession: true, 
      autoRefreshToken: true, 
      detectSessionInUrl: true,
      storage: window.localStorage,
      debug: true,
    },
  }
);

console.log("Supabase client initialized");

const App = () => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentStep, setCurrentStep] = useState('home');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [planCreationStatus, setPlanCreationStatus] = useState('idle');
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  const authCheckTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const resetAppState = useCallback(() => {
    setUser(null);
    setCurrentStep('home');
    setAnswers({});
    setError(null);
    setPlanCreationStatus('idle');
    setQuestionnaireCompleted(false);
    setHasSeenIntro(false);
    localStorage.clear();
    console.log("App state reset and local storage cleared");
  }, []);

  const checkExistingPlan = useCallback(async (userId) => {
    console.log("Checking existing plan for user:", userId);
    try {
      const { data, error } = await supabase
        .from('user_plan_theme')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === '406' || error.code === 'PGRST116') {
          console.log("No existing plan found");
          setPlanCreationStatus('idle');
        } else {
          throw error;
        }
      } else if (data) {
        console.log("Existing plan found:", data);
        setPlanCreationStatus('completed');
      } else {
        console.log("No existing plan found");
        setPlanCreationStatus('idle');
      }
    } catch (err) {
      console.error("Error checking existing plan:", err);
      setPlanCreationStatus('idle');
    }
  }, []);

  const checkQuestionnaireStatus = useCallback(async (userId) => {
    console.log("Checking questionnaire status for user:", userId);
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        console.log("User has completed questionnaire");
        setQuestionnaireCompleted(true);
        setAnswers(data);
        await checkExistingPlan(userId);
      } else {
        console.log("User has not completed questionnaire");
        setQuestionnaireCompleted(false);
        setPlanCreationStatus('idle');
      }
    } catch (err) {
      console.error("Error checking questionnaire status:", err);
      setError(err.message);
    }
  }, [checkExistingPlan]);

  const checkSession = useCallback(async () => {
    console.log("Starting session check...");
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Session check error:", error);
        throw error;
      }
      
      if (session) {
        console.log("Session found, user ID:", session.user.id);
        setUser(session.user);
        await checkQuestionnaireStatus(session.user.id);
      } else {
        console.log("No session found, resetting app state");
        resetAppState();
      }
    } catch (err) {
      console.error("Error in checkSession:", err);
      resetAppState();
      setError(`Session check failed: ${err.message}`);
    } finally {
      console.log("Session check completed");
      setAuthChecked(true);
      setLoading(false);
    }
  }, [resetAppState, checkQuestionnaireStatus]);

  useEffect(() => {
    console.log("App component effect running");
    let isMounted = true;
    let timeoutId = null;

    const initializeApp = async () => {
      console.log("Initializing app...");
      try {
        await checkSession();
      } catch (error) {
        console.error("Error during app initialization:", error);
        if (isMounted) {
          setError("Failed to initialize app. Please refresh the page.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };

    if (isInitialMount.current) {
      isInitialMount.current = false;
      initializeApp();

      timeoutId = setTimeout(() => {
        if (isMounted && loading && !isSigningOut) {
          console.log("Authentication check timed out");
          setLoading(false);
          setAuthChecked(true);
          setError("Authentication check timed out. Please refresh the page.");
        }
      }, 15000); // 15 seconds timeout
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          console.log("User signed out, resetting app state");
          resetAppState();
          setAuthChecked(true);
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session && !user) {
        if (isMounted) {
          console.log("User signed in, ID:", session.user.id);
          setUser(session.user);
          await checkQuestionnaireStatus(session.user.id);
          setAuthChecked(true);
          setLoading(false);
        }
      }
    });

    return () => {
      console.log("Cleaning up effect");
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [checkSession, resetAppState, checkQuestionnaireStatus, user, loading, isSigningOut]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      resetAppState();
      setIsSigningOut(false);
    } catch (err) {
      console.error("Sign out error:", err);
      setError(err.message);
      setIsSigningOut(false);
    }
  };

  const startCareerPlanning = () => {
    setCurrentStep('q1');
  };

  const startQuestionnaire = () => {
    setHasSeenIntro(true);
    setCurrentStep('q1');
  };

  const handleNext = async (stepData) => {
    try {
      console.log("handleNext called with currentStep:", currentStep);
      console.log("Received stepData in handleNext:", stepData);
      let newAnswers = { ...answers };
  
      if (currentStep === 'q1') {
        newAnswers.q1 = stepData.q1;
        if (newAnswers.q1.resume && newAnswers.q1.resume instanceof File) {
          const file = newAnswers.q1.resume;
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const { data, error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(fileName, file);
  
          if (uploadError) {
            console.error("Resume upload error:", uploadError);
            throw uploadError;
          }
  
          if (data) {
            const { data: { publicUrl }, error: urlError } = supabase.storage
              .from('resumes')
              .getPublicUrl(fileName);
  
            if (urlError) {
              console.error("Error getting public URL:", urlError);
              throw urlError;
            }
  
            newAnswers.q1.resumeUrl = publicUrl;
            console.log("Resume uploaded successfully. Public URL:", publicUrl);
          }
        }
      } else if (currentStep === 'q2' || currentStep === 'q3' || currentStep === 'q4') {
        newAnswers[currentStep] = stepData[currentStep];
      }
  
      setAnswers(newAnswers);
      console.log("Updated answers:", newAnswers);
  
      const nextStep = currentStep === 'q1' ? 'q2' :
                       currentStep === 'q2' ? 'q3' :
                       currentStep === 'q3' ? 'q4' : 'finished';
  
      console.log("Calculated next step:", nextStep);
  
      if (nextStep === 'finished') {
        console.log("Finished all questions, upserting data");
        const upsertData = {
          age: parseInt(newAnswers.q1.age, 10),
          field_of_work: newAnswers.q1.currentField,
          current_position: newAnswers.q1.currentPosition,
          gender: newAnswers.q1.gender,
          marital_status: newAnswers.q1.maritalStatus,
          education: newAnswers.q1.education,
          work_experience: newAnswers.q1.workExperience,
          resume: newAnswers.q1.resumeUrl || null,
          q2: newAnswers.q2,
          q3: newAnswers.q3,
          q4: newAnswers.q4
        };
        
        const { data: { user } } = await supabase.auth.getUser();
        console.log("Current user:", user);
        console.log("Upserting data:", upsertData);
  
        const { data, error: upsertError } = await supabase
          .from('user_info')
          .upsert(upsertData)
          .select();
  
          if (upsertError) {
            console.error("Upsert error:", upsertError);
            throw upsertError;
          }
          
          if (data) {
            console.log("Data upserted successfully:", data);
            setQuestionnaireCompleted(true);
            setCurrentStep('home');
          } else {
            console.error("No data returned from upsert");
            throw new Error("Failed to upsert data");
          }
        } else {
          setCurrentStep(nextStep);
        }
      } catch (error) {
        console.error('Error in handleNext:', error);
        setError(`An error occurred: ${error.message}`);
      }
    };
  
    const handleBack = () => {
      const prevStep = currentStep === 'q2' ? 'q1' :
                       currentStep === 'q3' ? 'q2' :
                       currentStep === 'q4' ? 'q3' : 'home';
      setCurrentStep(prevStep);
    };
  
    // const requestCareerPlan = async () => {
    //   try {
    //     console.log("Requesting career plan...");
    //     setPlanCreationStatus('loading');
    //     const response = await fetch(`${process.env.REACT_APP_API_URL}/generate_plan`, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ user_id: user.id }),
    //     });
    //     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    //     console.log("Career plan request successful");
    //     checkPlanStatus();
    //   } catch (err) {
    //     console.error("Error requesting career plan:", err);
    //     setError(err.message);
    //     setPlanCreationStatus('error');
    //   }
    // };
    
    const requestCareerPlan = async () => {
      try {
        console.log("Requesting career plan...");
        setPlanCreationStatus('loading');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/generate_plan`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Origin': 'https://athena-ai-0oc2.onrender.com'
          },
          body: JSON.stringify({ user_id: user.id }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Career plan request successful", data);
        checkPlanStatus();
      } catch (err) {
        console.error("Error requesting career plan:", err);
        setError(`Failed to fetch career plan: ${err.message}`);
        setPlanCreationStatus('error');
      }
    };


    const checkPlanStatus = async () => {
      try {
        console.log("Checking plan status...");
        const { data, error } = await supabase
          .from('user_plan_theme')
          .select('*')
          .eq('user_id', user.id)
          .single();
    
        if (error) {
          if (error.code === 'PGRST116') {
            console.log("Plan not found, checking again in 10 seconds");
            setTimeout(checkPlanStatus, 10000);
          } else {
            throw error;
          }
        } else if (data) {
          console.log("Plan data found:", data);
          setPlanCreationStatus('completed');
        } else {
          console.log("No error, but no data either. Checking again in 10 seconds");
          setTimeout(checkPlanStatus, 10000);
        }
      } catch (err) {
        console.error("Error checking plan status:", err);
        setError(err.message);
      }
    };
  
    if (!authChecked || loading) {
      return <div>Loading... Please wait.</div>;
    }
  
    if (error) {
      return <div>Error: {error}</div>;
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
  
        {currentStep !== 'home' && (
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
            {currentStep === 'home' && !questionnaireCompleted && !hasSeenIntro && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <CareerCompassIntro onStart={startQuestionnaire} />
              </motion.div>
            )}
            {currentStep === 'home' && !questionnaireCompleted && hasSeenIntro && (
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
            {['q1', 'q2', 'q3', 'q4'].includes(currentStep) && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg shadow-lg p-8"
              >
                {currentStep === 'q1' && <Question1 onNext={handleNext} previousAnswers={answers} />}
                {currentStep === 'q2' && <Question2 onNext={handleNext} previousAnswers={answers} />}
                {currentStep === 'q3' && <Question3 onNext={handleNext} previousAnswers={answers} />}
                {currentStep === 'q4' && <Question4 onNext={handleNext} previousAnswers={answers} />}
              </motion.div>
            )}
            {questionnaireCompleted && currentStep === 'home' && (
              <CareerCompass
                userId={user.id}
                planCreationStatus={planCreationStatus}
                onRequestPlan={requestCareerPlan}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };
  
  export default App;