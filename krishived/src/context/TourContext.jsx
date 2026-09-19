import { createContext, useContext, useState, useEffect } from 'react';

const TourContext = createContext(null);

export const TOUR_STEPS = [
  {
    id: 'welcome',
    targetSelector: '[data-tour="welcome-card"]',
    title: 'Welcome to KrishiVed 🌱',
    subtitle: 'Your AI Crop Health Assistant',
    description:
      'Welcome! KrishiVed helps you monitor your farm, identify crop diseases before they spread, and get instant treatment plans in your local language.',
    position: 'bottom',
  },
  {
    id: 'quick-detect',
    targetSelector: '[data-tour="quick-detect"]',
    title: 'Scan Crops & Diagnose Diseases 📸',
    subtitle: 'Instant AI Detection',
    description:
      'Take a photo of an affected leaf, stem, or crop. Our vision AI analyzes the symptoms, tells you the exact disease, risk level, and next steps.',
    position: 'bottom',
  },
  {
    id: 'fields',
    targetSelector: '[data-tour="nav-fields"]',
    title: 'Manage Your Plots & GPS 🗺️',
    subtitle: 'Track Every Plot',
    description:
      'Register your fields, record crop varieties, sowing dates, soil condition, and pinpoint your exact field coordinates on the interactive map.',
    position: 'right',
  },
  {
    id: 'stats',
    targetSelector: '[data-tour="dashboard-stats"]',
    title: 'Weather & Outbreak Alerts 🌦️',
    subtitle: 'Early Warning System',
    description:
      'Check localized weather conditions, temperature, humidity, and critical disease alerts tailored to your geographic region.',
    position: 'top',
  },
  {
    id: 'language',
    targetSelector: '[data-tour="language-select"]',
    title: 'Regional Languages & Voice AI 🎙️',
    subtitle: 'Bhashini Multi-language Voice',
    description:
      'Select your preferred Indian language (Hindi, Marathi, Punjabi, English, etc.) anytime. You can also use voice speech-to-text in the AI Chatbot!',
    position: 'bottom',
  },
];

const TOUR_STORAGE_KEY = 'krishived_app_tour_completed_v1';

export function TourProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Auto trigger for first-time visitors
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setCurrentStepIndex(0);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, []);

  function startTour() {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    setCurrentStepIndex(0);
    setTimeout(() => {
      setIsOpen(true);
    }, 150);
  }

  function nextStep() {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeTour();
    }
  }

  function prevStep() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }

  function skipTour() {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsOpen(false);
  }

  function completeTour() {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsOpen(false);
  }

  return (
    <TourContext.Provider
      value={{
        isOpen,
        currentStep: TOUR_STEPS[currentStepIndex],
        currentStepIndex,
        totalSteps: TOUR_STEPS.length,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
