
import React, { useState, useEffect } from 'react';
import { LessonData, Question, QuestionType, DictionaryResult } from '../types';
import { SpeakerIcon, CheckIcon, XIcon, ArrowLeftIcon, MicrophoneIcon, SlidersIcon, SearchIcon, XIcon as CloseIcon, HeartIcon, StarIcon, FireIcon } from './Icons';
import { generateLesson, lookupWord } from '../services/geminiService';

interface LessonRunnerProps {
  difficulty: any;
  topic: string;
  hearts: number;
  reduceHearts: () => void;
  onComplete: (score: number) => void;
  onExit: () => void;
  onError: () => void;
}

// Levenshtein distance implementation for calculating similarity
function levenshtein(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateSimilarity(str1: string, str2: string): number {
    const len = Math.max(str1.length, str2.length);
    if (len === 0) return 100;
    const distance = levenshtein(str1, str2);
    return ((len - distance) / len) * 100;
}

// Helper to get detailed feedback
const getPronunciationFeedback = (targetText: string, spokenText: string | null): string => {
    if (!spokenText) return "কিছু শোনা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন। (Nothing heard. Please try again.)";
    
    const normalize = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
    const target = normalize(targetText);
    const spoken = normalize(spokenText);
    
    if (target === spoken) return "চমৎকার উচ্চারণ! (Perfect pronunciation!)";

    const targetWords = target.split(/\s+/);
    const spokenWords = spoken.split(/\s+/);

    // Check for missing specific words
    const missing = targetWords.find(w => !spokenWords.includes(w));
    if (missing) {
         return `আপনি '${missing}' শব্দটি স্পষ্ট করে বলেননি। ('${missing}' was not clear.)`;
    }

    // Check for length mismatch implying extra or few words generally
    if (Math.abs(targetWords.length - spokenWords.length) > 2) {
        return "বাক্যটির দৈর্ঘ্য সঠিক মনে হচ্ছে না। আবার চেষ্টা করুন। (Sentence length doesn't match.)";
    }

    // Word by word comparison for the first mismatch
    for (let i = 0; i < Math.min(targetWords.length, spokenWords.length); i++) {
        if (targetWords[i] !== spokenWords[i]) {
             // If words are close (typo/slight mispronunciation)
             const dist = levenshtein(targetWords[i], spokenWords[i]);
             if (dist <= 2) {
                 return `'${targetWords[i]}' শব্দটির উচ্চারণ একটু ভুল ছিল। আবার চেষ্টা করুন। (Pronunciation of '${targetWords[i]}' was slightly off.)`;
             } else {
                 return `মনে হচ্ছে আপনি '${targetWords[i]}' এর বদলে '${spokenWords[i]}' বলেছেন। (You said '${spokenWords[i]}' instead of '${targetWords[i]}')`;
             }
        }
    }

    return "উচ্চারণটি আরও স্পষ্ট করার চেষ্টা করুন। (Try to pronounce more clearly.)";
};

type Sensitivity = 'Easy' | 'Medium' | 'Hard';

const LessonRunner: React.FC<LessonRunnerProps> = ({ difficulty, topic, hearts, reduceHearts, onComplete, onExit, onError }) => {
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Word Builder State
  // We store indices of the original 'options' array to track which tiles are used.
  const [builtWordIndices, setBuiltWordIndices] = useState<number[]>([]);

  const [spokenText, setSpokenText] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('Medium');
  const [showSettings, setShowSettings] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Lesson End States
  const [isLessonComplete, setIsLessonComplete] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Mini Dictionary State
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null);
  const [dictLoading, setDictLoading] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const data = await generateLesson(difficulty, topic);
        setLesson(data);
        setLoading(false);
      } catch (e) {
        console.error(e);
        onError();
      }
    };
    fetchLesson();
  }, [difficulty, topic, onError]);

  // Handler for clicking a word
  const handleWordClick = async (word: string) => {
    // Strip punctuation
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    if (!cleanWord || /^\s*$/.test(cleanWord)) return;

    // Only allow lookups for English text. 
    // Basic regex check for non-Bengali characters (assuming mostly English content for actionable words)
    if (!/^[a-zA-Z\s'-]+$/.test(cleanWord)) return;

    setSelectedWord(cleanWord);
    setDictLoading(true);
    setDictResult(null);

    try {
        // Use A1 level for simplicity in quick lookups
        const res = await lookupWord(cleanWord, "A1 (Beginner)");
        setDictResult(res);
    } catch (e) {
        console.error("Quick lookup failed", e);
        setDictResult(null);
    } finally {
        setDictLoading(false);
    }
  };

  const closeDictModal = () => {
      setSelectedWord(null);
      setDictResult(null);
  };

  const speak = (text: string, lang: string = 'en-US') => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsRecording(true);
      setSpokenText(null);
      setSelectedOption(null);
      setFeedback(null);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText(transcript);
        setSelectedOption(transcript); // Set as selected for checking logic
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } else {
      alert("দুঃখিত, আপনার ব্রাউজারে ভয়েস রেকর্ড সাপোর্ট নেই। (Sorry, speech recognition is not supported in this browser.)");
    }
  };

  const handleTileClick = (index: number, isSelectedArea: boolean) => {
    if (status !== 'idle') return;

    if (isSelectedArea) {
        // Remove from built word (return to pool)
        setBuiltWordIndices(prev => prev.filter(i => i !== index));
    } else {
        // Add to built word (if not already there - though logic prevents rendering duplicates)
        if (!builtWordIndices.includes(index)) {
             setBuiltWordIndices(prev => [...prev, index]);
        }
    }
  };

  const handleCheck = () => {
    if (!lesson) return;
    
    const currentQ = lesson.questions[currentIndex];
    let isCorrect = false;

    if (currentQ.type === QuestionType.Pronunciation) {
        if (!spokenText && !selectedOption) return; // Wait for input
        
        // Normalization
        const normalize = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
        const target = normalize(currentQ.correctAnswer);
        const input = normalize(spokenText || "");

        const similarity = calculateSimilarity(target, input);
        
        // Threshold based on sensitivity
        let threshold = 80; // Medium default
        if (sensitivity === 'Easy') threshold = 50;
        if (sensitivity === 'Hard') threshold = 95;

        // Also allow exact includes for very lenient cases or short phrases
        const simpleMatch = input === target || (sensitivity === 'Easy' && (input.includes(target) || target.includes(input)));
        
        isCorrect = simpleMatch || similarity >= threshold;
        
        // Generate detailed feedback
        const fb = getPronunciationFeedback(currentQ.correctAnswer, spokenText);
        setFeedback(fb);

    } else if (currentQ.type === QuestionType.WordBuilder) {
        const formedWord = builtWordIndices.map(i => currentQ.options[i]).join('');
        isCorrect = formedWord === currentQ.correctAnswer;
        setFeedback(null);
        setSelectedOption(formedWord); // To satisfy button state, though we rely on builtWordIndices for display

    } else {
        if (!selectedOption) return;
        isCorrect = selectedOption === currentQ.correctAnswer;
        setFeedback(null);
    }
    
    setStatus(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      setScore(s => s + 10);
      const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } else {
       // Wrong answer
       reduceHearts();
       const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/assets/soundboard/click.mp3');
       audio.volume = 0.5;
       audio.play().catch(() => {});
    }
  };

  const handleNext = () => {
    if (hearts === 0) {
        setIsGameOver(true);
        return;
    }

    if (!lesson) return;
    if (currentIndex < lesson.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setSpokenText(null);
      setBuiltWordIndices([]);
      setStatus('idle');
      setFeedback(null);
    } else {
      setIsLessonComplete(true);
    }
  };

  // Check game over condition when hearts update
  useEffect(() => {
    if (hearts === 0) {
        setIsGameOver(true);
    }
  }, [hearts]);

  const getOptionClass = (option: string, correct: string) => {
    const base = "p-4 rounded-xl border-2 text-left transition-all relative ";
    const isSelected = selectedOption === option;
    const isCorrectAnswer = option === correct;

    if (status === 'idle') {
        if (isSelected) return base + "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-500 dark:text-blue-300 shadow-md transform scale-[1.02]";
        return base + "bg-white border-gray-200 hover:bg-gray-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-750 dark:text-slate-200";
    }

    // Feedback state
    if (isCorrectAnswer) {
        return base + "bg-green-100 border-green-500 text-green-700 font-medium dark:bg-green-900/50 dark:text-green-300";
    }

    if (isSelected && !isCorrectAnswer) {
        return base + "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/50 dark:text-red-300";
    }

    return base + "bg-white border-gray-200 opacity-50 dark:bg-slate-800 dark:border-slate-700";
  };

  const renderClickableSentence = (text: string, type: QuestionType) => {
      // Dynamic Fill Blank replacement
      if (type === QuestionType.FillBlank) {
          const parts = text.split(/(_+)/);
          return (
             <div className="flex flex-wrap gap-1 items-baseline whitespace-pre-wrap">
                 {parts.map((part, idx) => {
                     if (part.startsWith('_')) {
                         return (
                            <span key={idx} className="border-b-2 border-slate-400 font-bold px-2 text-blue-600 dark:text-blue-400 min-w-[3rem] text-center inline-block">
                                {selectedOption || <span className="text-transparent">a</span>}
                            </span>
                         )
                     }
                     // Preserve newlines in the text parts
                     return <span key={idx} className="whitespace-pre-wrap">{part}</span>
                 })}
             </div>
          )
      }

      // Default Clickable Text
      const lines = text.split('\n');
      return (
        <div className="whitespace-pre-wrap">
           {lines.map((line, lineIdx) => (
             <div key={lineIdx} className={lineIdx > 0 ? "mt-2" : ""}>
               {line.split(' ').map((word, idx) => (
                  <span 
                    key={`${lineIdx}-${idx}`} 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleWordClick(word);
                    }}
                    className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-300 rounded px-1 transition-colors border-b border-transparent hover:border-blue-300 border-dotted"
                  >
                      {word}{' '}
                  </span>
               ))}
             </div>
           ))}
        </div>
      );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] pt-safe-top">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
        <p className="mt-4 text-gray-500 text-lg bengali-text dark:text-gray-400">পাঠ তৈরি করা হচ্ছে... (Generating Lesson...)</p>
      </div>
    );
  }

  // GAME OVER SCREEN
  if (isGameOver) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 p-6 text-center animate-in fade-in zoom-in duration-300 pt-safe-top pb-safe-bottom">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                  <HeartIcon className="w-12 h-12 text-red-500" fill />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Out of Hearts!</h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 bengali-text">আপনার সব হার্ট শেষ হয়ে গেছে। (You ran out of hearts.)</p>
              
              <button 
                onClick={onExit}
                className="w-full max-w-sm py-4 bg-blue-500 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-600 transition-transform hover:scale-105"
              >
                  Back to Dashboard
              </button>
          </div>
      )
  }

  // LESSON COMPLETE SCREEN
  if (isLessonComplete) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 p-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-500 pt-safe-top pb-safe-bottom">
              <div className="relative mb-8">
                  <div className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                     <StarIcon className="w-16 h-16 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900">
                      <CheckIcon className="w-6 h-6 text-white" />
                  </div>
              </div>
              
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Lesson Complete!</h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 bengali-text">অভিনন্দন! আপনি পাঠটি সম্পূর্ণ করেছেন।</p>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                      <p className="text-xs font-bold text-gray-400 uppercase">Total XP</p>
                      <p className="text-2xl font-bold text-yellow-500">{score + (status === 'correct' ? 10 : 0)}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                      <p className="text-xs font-bold text-gray-400 uppercase">Hearts Left</p>
                      <div className="flex items-center justify-center gap-1">
                         <HeartIcon className="w-6 h-6 text-red-500" fill />
                         <p className="text-2xl font-bold text-slate-700 dark:text-white">{hearts}</p>
                      </div>
                  </div>
              </div>

              <button 
                onClick={() => onComplete(score + (status === 'correct' ? 10 : 0))}
                className="w-full max-w-sm py-4 bg-green-500 text-white font-bold rounded-2xl shadow-lg hover:bg-green-600 transition-transform hover:scale-105"
              >
                  Continue
              </button>
          </div>
      )
  }

  if (!lesson) return null;

  const currentQ = lesson.questions[currentIndex];
  const progress = ((currentIndex) / lesson.questions.length) * 100;
  const isPronunciation = currentQ.type === QuestionType.Pronunciation;
  const isWordBuilder = currentQ.type === QuestionType.WordBuilder;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-4 py-4 relative min-h-screen pt-safe-top">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <button onClick={onExit} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <CloseIcon className="w-6 h-6" />
        </button>
        
        {/* Progress Bar */}
        <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-4 relative overflow-hidden">
          <div 
            className="bg-green-500 h-4 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          >
             <div className="absolute top-0 right-0 bottom-0 w-full bg-white/20 animate-pulse"></div>
          </div>
        </div>

        {/* Hearts Display */}
        <div className="flex items-center space-x-1">
             <HeartIcon className="w-6 h-6 text-red-500 animate-pulse" fill />
             <span className="text-red-500 font-bold">{hearts}</span>
        </div>
      </div>

      <div className="flex-1 animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-white mb-2 bengali-text">{lesson.title}</h2>
        
        <div className="my-6">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg text-gray-600 dark:text-slate-300 bengali-text font-medium">
                    {currentQ.type === QuestionType.TranslateToEnglish ? "নিচের বাক্যটি ইংরেজিতে অনুবাদ করুন" : 
                     currentQ.type === QuestionType.TranslateToBengali ? "Translate this sentence" : 
                     currentQ.type === QuestionType.Pronunciation ? "বাক্যটি জোরে পড়ুন (Read this aloud)" :
                     currentQ.type === QuestionType.WordBuilder ? "শব্দটি তৈরি করুন (Form the word)" :
                     "Fill in the blank"}
                </h3>
                
                {isPronunciation && (
                   <div className="relative">
                      <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-gray-400 hover:text-blue-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
                        title="Adjust Sensitivity"
                      >
                         <SlidersIcon className="w-6 h-6" />
                      </button>
                      
                      {showSettings && (
                        <div className="absolute right-0 top-10 bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-slate-700 rounded-xl p-3 z-20 w-48">
                           <p className="text-xs font-bold text-gray-400 uppercase mb-2">Sensitivity</p>
                           <div className="flex flex-col gap-1">
                              {['Easy', 'Medium', 'Hard'].map((lvl) => (
                                 <button
                                   key={lvl}
                                   onClick={() => {
                                      setSensitivity(lvl as Sensitivity);
                                      setShowSettings(false);
                                   }}
                                   className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${sensitivity === lvl ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300'}`}
                                 >
                                   {lvl}
                                 </button>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>
                )}
            </div>
            
            <div className="flex items-start gap-4 mb-8">
               <button 
                 onClick={() => {
                   const isBengaliQuestion = currentQ.type === QuestionType.TranslateToEnglish;
                   const textToSpeak = currentQ.questionText.replace(/_+/g, ' blank ');
                   speak(textToSpeak, isBengaliQuestion ? 'bn-IN' : 'en-US');
                 }}
                 className="mt-1 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-500 dark:text-blue-300 p-3 rounded-xl transition-colors flex-shrink-0 shadow-sm"
                 title="Listen to question"
                 aria-label="Listen to question"
               >
                 <SpeakerIcon className="w-8 h-8" />
               </button>
                
                <div className="text-xl md:text-2xl font-bold text-slate-700 dark:text-white leading-relaxed bengali-text w-full whitespace-pre-wrap">
                  {/* If English, make words clickable. If Bengali, show as text (mostly) */}
                  {currentQ.type === QuestionType.TranslateToBengali || currentQ.type === QuestionType.FillBlank || currentQ.type === QuestionType.Pronunciation ? (
                      renderClickableSentence(currentQ.questionText, currentQ.type)
                  ) : (
                      currentQ.questionText
                  )}
                </div>
            </div>

            {/* Questions Grid OR Pronunciation UI OR WordBuilder UI */}
            {isPronunciation ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                    <button
                        onClick={startListening}
                        disabled={status !== 'idle' || isRecording}
                        className={`
                            relative w-32 h-32 rounded-full flex items-center justify-center transition-all
                            ${isRecording ? 'bg-red-500 animate-pulse ring-4 ring-red-200 dark:ring-red-900' : 
                              status === 'idle' ? 'bg-blue-500 hover:bg-blue-600 shadow-xl' : 'bg-gray-300 dark:bg-slate-600'}
                        `}
                    >
                        <MicrophoneIcon className="w-12 h-12 text-white" isRecording={isRecording} />
                        {isRecording && <span className="absolute -bottom-8 text-red-500 dark:text-red-400 font-bold">Listening...</span>}
                    </button>
                    
                    {spokenText && (
                        <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">You said:</p>
                            <p className="text-lg text-slate-700 dark:text-slate-200 italic">"{spokenText}"</p>
                        </div>
                    )}
                </div>
            ) : isWordBuilder ? (
                <div className="flex flex-col gap-6">
                    {/* Answer Area */}
                    <div className="min-h-[80px] bg-gray-100 dark:bg-slate-700 rounded-xl flex flex-wrap items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-slate-600">
                        {builtWordIndices.map((originalIndex) => (
                             <button
                                key={`built-${originalIndex}`}
                                onClick={() => handleTileClick(originalIndex, true)}
                                className="w-12 h-12 md:w-14 md:h-14 bg-white dark:bg-slate-800 text-slate-700 dark:text-white rounded-lg shadow-md border-b-4 border-gray-200 dark:border-slate-900 font-bold text-xl flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors animate-in zoom-in duration-200"
                             >
                                 {currentQ.options[originalIndex]}
                             </button>
                        ))}
                        {builtWordIndices.length === 0 && (
                            <span className="text-gray-400 text-sm">Tap letters below to build the word</span>
                        )}
                    </div>

                    {/* Options Pool */}
                    <div className="flex flex-wrap justify-center gap-3">
                        {currentQ.options.map((char, index) => {
                            const isUsed = builtWordIndices.includes(index);
                            return (
                                <button
                                    key={`pool-${index}`}
                                    onClick={() => handleTileClick(index, false)}
                                    disabled={isUsed || status !== 'idle'}
                                    className={`
                                        w-12 h-12 md:w-14 md:h-14 rounded-lg font-bold text-xl flex items-center justify-center transition-all
                                        ${isUsed 
                                            ? 'bg-gray-200 dark:bg-slate-700 text-transparent border-0 cursor-default' 
                                            : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md border-b-4 border-blue-200 dark:border-slate-900 hover:-translate-y-1 active:border-b-0 active:translate-y-0'}
                                    `}
                                >
                                    {char}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                {currentQ.options.map((option, idx) => (
                    <button
                    key={idx}
                    onClick={() => {
                        if (status === 'idle') setSelectedOption(option);
                    }}
                    disabled={status !== 'idle'}
                    className={getOptionClass(option, currentQ.correctAnswer)}
                    >
                    <span className="bengali-text text-lg">{option}</span>
                    </button>
                ))}
                </div>
            )}
        </div>
      </div>

      {/* Mini Dictionary Modal */}
      {selectedWord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeDictModal}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-750">
                      <h3 className="font-bold text-gray-700 dark:text-gray-300 uppercase text-sm tracking-wide">Quick Look</h3>
                      <button onClick={closeDictModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <CloseIcon className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-white capitalize">{selectedWord}</h2>
                          <button 
                            onClick={() => speak(selectedWord)}
                            className="text-blue-500 bg-blue-50 dark:bg-blue-900/50 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
                          >
                             <SpeakerIcon className="w-5 h-5" />
                          </button>
                      </div>

                      {dictLoading ? (
                           <div className="flex justify-center py-6">
                               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                           </div>
                      ) : dictResult ? (
                          <div className="space-y-3">
                              {dictResult.phonetic && (
                                  <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-xs font-mono rounded-md mb-2">
                                      {dictResult.phonetic}
                                  </span>
                              )}
                              <div>
                                  <p className="text-xs font-bold text-gray-400 uppercase">Meaning</p>
                                  <p className="text-lg bengali-text text-slate-800 dark:text-slate-100 font-medium">{dictResult.meaning}</p>
                              </div>
                              <div>
                                  <p className="text-xs font-bold text-gray-400 uppercase">Definition</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-300">{dictResult.definition}</p>
                              </div>
                              <button onClick={() => {
                                  // Navigate to full dictionary? Or just close
                                  closeDictModal();
                              }} className="w-full mt-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-bold hover:bg-gray-200 dark:hover:bg-slate-600">
                                  Close
                              </button>
                          </div>
                      ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                              Could not load definition.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Footer / Feedback Section */}
      <div className={`
        fixed bottom-0 left-0 right-0 p-4 border-t transition-transform duration-300 z-10 pb-safe-bottom
        ${status === 'idle' ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700' : 
          status === 'correct' ? 'bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-800'}
      `}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex-1 pr-4">
            {status === 'idle' ? (
               <button
                onClick={handleCheck}
                disabled={!selectedOption && !isWordBuilder && !isPronunciation} // Ensure button is clickable for WordBuilder if something is selected (handled in handleCheck logic check actually, let's refine)
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wide transition-all ${
                  (selectedOption || (isWordBuilder && builtWordIndices.length > 0) || (isPronunciation && spokenText))
                    ? 'bg-green-500 text-white shadow-lg hover:bg-green-600' 
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                Check
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center w-full gap-4">
                 <div className="flex-shrink-0 mb-2 sm:mb-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status === 'correct' ? 'bg-green-500' : 'bg-red-500'}`}>
                       {status === 'correct' ? <CheckIcon className="w-8 h-8 text-white" /> : <XIcon className="w-8 h-8 text-white" />}
                    </div>
                 </div>
                 <div className="flex-1">
                    <h3 className={`font-bold text-lg ${status === 'correct' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                       {status === 'correct' ? 'Correct!' : 'Incorrect'}
                    </h3>
                    
                    <div className="text-sm md:text-base text-gray-600 dark:text-gray-300 bengali-text mt-1">
                       {/* Display Pronunciation Feedback specifically if it exists, otherwise general explanation */}
                       {currentQ.type === QuestionType.Pronunciation 
                          ? feedback 
                          : currentQ.explanation}
                    </div>
                 </div>
                 <button
                   onClick={handleNext}
                   className={`px-8 py-3 rounded-xl font-bold uppercase tracking-wide text-white shadow-lg transition-all flex-shrink-0 ${
                     status === 'correct' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                   }`}
                 >
                   Continue
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Spacer for fixed footer */}
      <div className="h-32"></div>
    </div>
  );
};

export default LessonRunner;
