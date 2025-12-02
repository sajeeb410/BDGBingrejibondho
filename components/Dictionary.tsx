
import React, { useState, useEffect } from 'react';
import { SearchIcon, SpeakerIcon, BookIcon, CheckIcon, XIcon } from './Icons';
import { lookupWord, checkSentence } from '../services/geminiService';
import { DictionaryResult } from '../types';

const LEVELS = [
  { id: 'A1', label: 'A1 (Beginner)' },
  { id: 'A2', label: 'A2 (Elementary)' },
  { id: 'B1', label: 'B1 (Intermediate)' },
  { id: 'B2', label: 'B2 (Upper Intermediate)' },
  { id: 'C1', label: 'C1 (Advanced)' },
  { id: 'C2', label: 'C2 (Proficient)' },
];

const WORDS_OF_THE_DAY = [
    'Resilience', 'Curiosity', 'Gratitude', 'Innovation', 'Empathy', 
    'Courage', 'Patience', 'Optimism', 'Integrity', 'Adaptability',
    'Serendipity', 'Eloquent', 'Ephemeral', 'Diligence', 'Harmony'
];

const Dictionary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dictionary' | 'pronunciation'>('dictionary');
  const [searchTerm, setSearchTerm] = useState('');
  const [level, setLevel] = useState('A1');
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New States
  const [history, setHistory] = useState<string[]>([]);
  const [userSentence, setUserSentence] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [sentenceFeedback, setSentenceFeedback] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('ib_dict_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveHistory = (word: string) => {
    const newHistory = [word, ...history.filter(w => w !== word)].slice(0, 5); // Keep last 5
    setHistory(newHistory);
    localStorage.setItem('ib_dict_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
      setHistory([]);
      localStorage.removeItem('ib_dict_history');
  };

  const handleSearch = async (e?: React.FormEvent, termOverride?: string) => {
    if (e) e.preventDefault();
    const term = termOverride || searchTerm;
    if (!term.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSentenceFeedback(null);
    setUserSentence('');
    setSearchTerm(term); // Ensure input matches if clicked from history

    try {
      const selectedLevel = LEVELS.find(l => l.id === level)?.label || 'A1 (Beginner)';
      const data = await lookupWord(term, selectedLevel);
      setResult(data);
      saveHistory(data.word);
    } catch (err) {
      setError('শব্দটি খুঁজে পাওয়া যায়নি। আবার চেষ্টা করুন। (Word not found)');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSentence = async () => {
      if (!userSentence.trim() || !result) return;
      setFeedbackLoading(true);
      try {
          const fb = await checkSentence(result.word, userSentence);
          setSentenceFeedback(fb);
      } catch (e) {
          setSentenceFeedback("Error checking sentence.");
      } finally {
          setFeedbackLoading(false);
      }
  };

  const speak = (text: string, rate: number = 1) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  // Word of the Day logic (Deterministic based on day of year)
  const getWordOfTheDay = () => {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      return WORDS_OF_THE_DAY[dayOfYear % WORDS_OF_THE_DAY.length];
  };

  const wotd = getWordOfTheDay();

  return (
    <div className="max-w-md mx-auto w-full p-4 flex flex-col items-center min-h-[80vh]">
      <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors duration-300">
        <h2 className="text-xl font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
          <BookIcon className="w-6 h-6 text-blue-500" />
          <span>Dictionary (অভিধান)</span>
        </h2>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-slate-700 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('dictionary')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dictionary' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Definitions
          </button>
          <button 
            onClick={() => setActiveTab('pronunciation')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pronunciation' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Pronunciation
          </button>
        </div>

        {activeTab === 'dictionary' && (
          <div className="mb-4 animate-in fade-in">
            <label htmlFor="level-select" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Proficiency Level
            </label>
            <select
              id="level-select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
            >
              {LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={(e) => handleSearch(e)} className="relative w-full mb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'pronunciation' ? "Type a word to hear it..." : "Search an English word..."}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-400 dark:placeholder-gray-500"
          />
          <SearchIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <button 
            type="submit" 
            className="absolute right-2 top-2 bg-blue-500 text-white p-1.5 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go
          </button>
        </form>

        {/* Search History */}
        {!result && !loading && history.length > 0 && (
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                   <p className="text-xs font-bold text-gray-400 uppercase">Recent Searches</p>
                   <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-500">Clear</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {history.map((h, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleSearch(undefined, h)}
                            className="px-3 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full text-sm text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            {h}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Word of the Day (shown when idle and in Dictionary tab) */}
        {!result && !loading && activeTab === 'dictionary' && (
            <div className="mt-4 p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white text-center shadow-lg transform transition-all hover:scale-[1.02]">
                <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">Word of the Day</p>
                <h3 className="text-3xl font-extrabold mb-4">{wotd}</h3>
                <button 
                   onClick={() => handleSearch(undefined, wotd)}
                   className="px-6 py-2 bg-white text-indigo-600 font-bold rounded-full shadow-md hover:bg-gray-100 transition-colors"
                >
                    Learn it
                </button>
            </div>
        )}

        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl text-center text-sm border border-red-100 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* PRONUNCIATION TAB CONTENT */}
            {activeTab === 'pronunciation' ? (
              <div className="flex flex-col items-center text-center space-y-6">
                  <div>
                    <h3 className="text-4xl font-extrabold text-slate-800 dark:text-white capitalize tracking-tight mb-2">{result.word}</h3>
                    {result.phonetic && (
                      <span className="inline-block px-4 py-2 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-mono text-2xl rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                        /{result.phonetic}/
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4">
                      <button 
                        onClick={() => speak(result.word, 1)}
                        className="flex flex-col items-center justify-center w-24 h-24 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl shadow-lg transition-transform transform active:scale-95"
                      >
                        <SpeakerIcon className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold uppercase">Normal</span>
                      </button>

                      <button 
                        onClick={() => speak(result.word, 0.5)}
                        className="flex flex-col items-center justify-center w-24 h-24 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl shadow-lg transition-transform transform active:scale-95"
                      >
                        <SpeakerIcon className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold uppercase">Slow</span>
                      </button>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-750 rounded-xl border border-gray-100 dark:border-slate-700 w-full text-left">
                     <p className="text-sm text-gray-500 dark:text-gray-400">Meaning: <span className="font-bold text-slate-700 dark:text-slate-200 bengali-text">{result.meaning}</span></p>
                     
                     {result.pronunciationTip && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">How to Pronounce (বাংলায়)</p>
                            <p className="text-lg text-slate-700 dark:text-slate-200 bengali-text font-medium">{result.pronunciationTip}</p>
                        </div>
                     )}
                  </div>
              </div>
            ) : (
            
            /* DICTIONARY TAB CONTENT */
            <div className="space-y-5">
              <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white capitalize tracking-tight">{result.word}</h3>
                    {result.phonetic && (
                      <span className="inline-block mt-2 px-3 py-1 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-base rounded-md border border-gray-200 dark:border-slate-600 shadow-sm">
                        /{result.phonetic}/
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => speak(result.word)}
                    className="bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-500 dark:text-blue-300 p-3 rounded-full transition-colors"
                  >
                    <SpeakerIcon className="w-6 h-6" />
                  </button>
              </div>

              {/* Meaning */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-300 font-bold uppercase mb-1">Meaning (বাংলা অর্থ)</p>
                <p className="text-xl text-slate-800 dark:text-slate-100 bengali-text font-medium">{result.meaning}</p>
              </div>

              {/* Definition */}
              <div className="relative">
                <div className="flex justify-between items-center mb-1">
                   <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">Definition ({level})</p>
                   <button 
                      onClick={() => speak(result.definition)}
                      className="text-gray-400 hover:text-blue-500 p-1"
                      title="Listen"
                    >
                      <SpeakerIcon className="w-4 h-4" />
                   </button>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg">{result.definition}</p>
              </div>

              {/* Examples */}
              {result.examples && result.examples.length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-xl border-l-4 border-yellow-400 dark:border-yellow-600">
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-3">Examples</p>
                    <div className="space-y-3">
                        {result.examples.map((ex, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <button 
                                  onClick={() => speak(ex)}
                                  className="mt-0.5 flex-shrink-0 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                                >
                                  <SpeakerIcon className="w-4 h-4" />
                                </button>
                                <p className="text-slate-700 dark:text-slate-300 italic text-sm">"{ex}"</p>
                            </div>
                        ))}
                    </div>
                  </div>
              )}

              {/* Synonyms */}
              {result.synonyms && result.synonyms.length > 0 && (
                <div>
                   <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-2">Synonyms</p>
                   <div className="flex flex-wrap gap-2">
                     {result.synonyms.map(syn => (
                       <button 
                         key={syn} 
                         onClick={() => handleSearch(undefined, syn)}
                         className="px-3 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full text-sm text-gray-600 dark:text-gray-300 transition-colors"
                       >
                         {syn}
                       </button>
                     ))}
                   </div>
                </div>
              )}

              {/* Sentence Feedback / Practice */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-700 dark:text-white mb-2">Practice using "<span className="capitalize">{result.word}</span>"</p>
                  <div className="relative">
                      <input 
                        type="text" 
                        value={userSentence}
                        onChange={(e) => setUserSentence(e.target.value)}
                        placeholder={`Write a sentence with '${result.word}'...`}
                        className="w-full p-3 pr-12 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                      />
                      <button 
                        onClick={handleCheckSentence}
                        disabled={feedbackLoading || !userSentence.trim()}
                        className="absolute right-2 top-2 p-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                      >
                         {feedbackLoading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> : <CheckIcon className="w-4 h-4" />}
                      </button>
                  </div>
                  {sentenceFeedback && (
                      <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-lg text-sm bengali-text animate-in fade-in">
                          {sentenceFeedback}
                      </div>
                  )}
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dictionary;
