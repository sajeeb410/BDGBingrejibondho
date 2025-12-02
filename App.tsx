
import React, { useState, useEffect } from 'react';
import { Difficulty, UserState } from './types';
import Dashboard from './components/Dashboard';
import LessonRunner from './components/LessonRunner';
import Dictionary from './components/Dictionary';
import Translator from './components/Translator';
import Account from './components/Account';
import { HeartIcon, StarIcon, FireIcon, LibraryIcon, BookIcon, SunIcon, MoonIcon, UserIcon, TranslateIcon } from './components/Icons';

function App() {
  // Simple persistent state simulation
  const [userState, setUserState] = useState<UserState>(() => {
    const saved = localStorage.getItem('ib_user_state');
    return saved ? JSON.parse(saved) : {
      username: 'Student',
      xp: 0,
      hearts: 5,
      level: Difficulty.Beginner,
      completedLessons: [],
      streak: 0,
      lastLessonDate: undefined
    };
  });

  const [view, setView] = useState<'dashboard' | 'lesson' | 'dictionary' | 'translator' | 'account'>('dashboard');
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('ib_dark_mode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ib_user_state', JSON.stringify(userState));
  }, [userState]);

  useEffect(() => {
    localStorage.setItem('ib_dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const startLesson = (level: Difficulty, topic: string) => {
    if (userState.hearts <= 0) {
      alert("No hearts left! Wait for a refill (simulated).");
      setUserState(p => ({ ...p, hearts: 5 })); // Auto refill for demo
      return;
    }
    setCurrentTopic(topic);
    setView('lesson');
  };

  const reduceHearts = () => {
    setUserState(prev => ({
      ...prev,
      hearts: Math.max(0, prev.hearts - 1)
    }));
  };

  const handleLessonComplete = (scoreToAdd: number) => {
    const today = new Date().toDateString();

    setUserState(prev => {
      let newStreak = prev.streak;
      
      // Calculate streak
      if (prev.lastLessonDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (prev.lastLessonDate === yesterday.toDateString()) {
          // Practiced yesterday, increment streak
          newStreak += 1;
        } else {
          // Missed a day or first time, reset/start streak
          newStreak = 1;
        }
      }
      // If lastLessonDate === today, streak remains the same

      return {
        ...prev,
        xp: prev.xp + scoreToAdd,
        completedLessons: currentTopic 
          ? [...new Set([...prev.completedLessons, `${prev.level}-${currentTopic}`])] 
          : prev.completedLessons,
        streak: newStreak,
        lastLessonDate: today
      };
    });
    
    setView('dashboard');
    setCurrentTopic(null);
  };

  const handleLessonExit = () => {
    setView('dashboard');
    setCurrentTopic(null);
  };

  const handleLessonError = () => {
    alert("Could not generate lesson. Please check API Key or try again.");
    setView('dashboard');
  };

  const changeDifficulty = (diff: Difficulty) => {
    setUserState(p => ({ ...p, level: diff }));
  };

  const handleUpdateUser = (newState: Partial<UserState>) => {
      setUserState(prev => ({ ...prev, ...newState }));
  };

  const handleImportProgress = (data: UserState) => {
      setUserState(data);
      alert("Progress imported successfully! (অগ্রগতি সফলভাবে লোড হয়েছে!)");
  };

  const handleResetProgress = () => {
      setUserState({
        username: 'Student',
        xp: 0,
        hearts: 5,
        level: Difficulty.Beginner,
        completedLessons: [],
        streak: 0,
        lastLessonDate: undefined
      });
      localStorage.removeItem('ib_lesson_*'); // Optionally clear lesson cache too? 
      // Actually localStorage lesson clearing is complex with wildcards, let's just reset user state.
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col`}>
      
      {/* Top Navigation Bar */}
      {view !== 'lesson' && (
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 transition-colors duration-300 pt-safe-top">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView('dashboard')}>
               <span className="text-2xl">🇧🇩🇬🇧</span>
               <h1 className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:block">Ingreji Bondhu</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              
              {/* Dark Mode Toggle */}
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors mr-1"
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>

              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 mr-2">
                 <button 
                  onClick={() => setView('dashboard')}
                  className={`p-1.5 rounded-md transition-all ${view === 'dashboard' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-slate-400'}`}
                  title="Lessons"
                 >
                   <BookIcon className="w-5 h-5" />
                 </button>
                 <button 
                  onClick={() => setView('dictionary')}
                  className={`p-1.5 rounded-md transition-all ${view === 'dictionary' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-slate-400'}`}
                  title="Dictionary"
                 >
                   <LibraryIcon className="w-5 h-5" />
                 </button>
                 <button 
                  onClick={() => setView('translator')}
                  className={`p-1.5 rounded-md transition-all ${view === 'translator' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-slate-400'}`}
                  title="Translator"
                 >
                   <TranslateIcon className="w-5 h-5" />
                 </button>
                 <button 
                  onClick={() => setView('account')}
                  className={`p-1.5 rounded-md transition-all ${view === 'account' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-slate-400'}`}
                  title="Account"
                 >
                   <UserIcon className="w-5 h-5" />
                 </button>
              </div>

              <div className="flex items-center space-x-1 text-orange-500 font-bold hidden xs:flex">
                 <FireIcon className="w-6 h-6" fill={userState.streak > 0} />
                 <span className="text-sm">{userState.streak}</span>
              </div>

              <div className="flex items-center space-x-1 text-red-500 font-bold hidden xs:flex">
                 <HeartIcon className="w-6 h-6" fill />
                 <span className="text-sm">{userState.hearts}</span>
              </div>

              <div className="flex items-center space-x-1 text-yellow-500 font-bold">
                 <StarIcon className="w-6 h-6" />
                 <span className="text-sm">{userState.xp}</span>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 pb-safe-bottom">
        {view === 'dashboard' ? (
          <Dashboard 
            userState={userState} 
            onSelectTopic={startLesson}
            onDifficultyChange={changeDifficulty}
          />
        ) : view === 'dictionary' ? (
          <Dictionary />
        ) : view === 'translator' ? (
          <Translator />
        ) : view === 'account' ? (
          <Account 
            userState={userState}
            onUpdateUser={handleUpdateUser}
            onImportProgress={handleImportProgress}
            onReset={handleResetProgress}
          />
        ) : (
          <LessonRunner 
            difficulty={userState.level}
            topic={currentTopic || 'general'}
            hearts={userState.hearts}
            reduceHearts={reduceHearts}
            onComplete={handleLessonComplete}
            onExit={handleLessonExit}
            onError={handleLessonError}
          />
        )}
      </main>

    </div>
  );
}

export default App;
