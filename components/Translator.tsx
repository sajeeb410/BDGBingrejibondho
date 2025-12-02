
import React, { useState } from 'react';
import { TranslateIcon, SwitchIcon, CopyIcon, SpeakerIcon, XIcon } from './Icons';
import { translateText } from '../services/geminiService';

const Translator: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [direction, setDirection] = useState<'bn-en' | 'en-bn'>('bn-en');
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setOutputText('');
    try {
      const result = await translateText(inputText, direction);
      setOutputText(result);
    } catch (error) {
      setOutputText('Failed to translate.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleSpeak = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Choose voice based on language
    // If direction is bn-en, output is English (en-US). 
    // If direction is en-bn, output is Bengali (bn-IN).
    const lang = direction === 'bn-en' ? 'en-US' : 'bn-IN';
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const handleSwitch = () => {
    setDirection(prev => prev === 'bn-en' ? 'en-bn' : 'bn-en');
    setInputText(outputText);
    setOutputText(inputText);
  };

  const clearInput = () => {
      setInputText('');
      setOutputText('');
  };

  return (
    <div className="max-w-md mx-auto w-full p-4 flex flex-col items-center min-h-[80vh]">
      <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors duration-300">
        <h2 className="text-xl font-bold text-slate-700 dark:text-white mb-6 flex items-center gap-2">
          <TranslateIcon className="w-6 h-6 text-purple-500" />
          <span>Translator (অনুবাদক)</span>
        </h2>

        {/* Language Controls */}
        <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-700 rounded-xl p-1 mb-6">
           <div className="flex-1 text-center py-2 font-bold text-slate-700 dark:text-slate-200 text-sm">
               {direction === 'bn-en' ? 'Bengali (বাংলা)' : 'English'}
           </div>
           
           <button 
             onClick={handleSwitch}
             className="p-2 bg-white dark:bg-slate-600 rounded-full shadow-sm hover:rotate-180 transition-transform duration-300"
           >
               <SwitchIcon className="w-5 h-5 text-purple-500 dark:text-purple-300" />
           </button>

           <div className="flex-1 text-center py-2 font-bold text-slate-700 dark:text-slate-200 text-sm">
               {direction === 'bn-en' ? 'English' : 'Bengali (বাংলা)'}
           </div>
        </div>

        {/* Input Area */}
        <div className="relative mb-4">
             <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={direction === 'bn-en' ? "বাংলা লিখুন..." : "Type English here..."}
                className="w-full h-32 p-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-750 text-lg text-slate-800 dark:text-white focus:outline-none focus:border-purple-500 resize-none placeholder-gray-400"
             />
             {inputText && (
                 <button 
                   onClick={clearInput}
                   className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                 >
                     <XIcon className="w-5 h-5" />
                 </button>
             )}
        </div>

        {/* Action Button */}
        <button
            onClick={handleTranslate}
            disabled={loading || !inputText.trim()}
            className="w-full py-3 mb-6 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
        >
            {loading ? 'Translating...' : 'Translate'}
        </button>

        {/* Output Area */}
        <div className="relative">
             <div className={`w-full h-32 p-4 rounded-xl border border-gray-200 dark:border-slate-600 ${outputText ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-100 dark:bg-slate-800'} text-lg text-slate-800 dark:text-white transition-colors`}>
                 {outputText || <span className="text-gray-400 italic text-sm">Translation will appear here...</span>}
             </div>
             
             {outputText && (
                 <div className="absolute bottom-2 right-2 flex gap-2">
                     <button 
                       onClick={() => handleSpeak(outputText)}
                       className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-slate-600 text-purple-500 dark:text-purple-300"
                       title="Listen"
                     >
                         <SpeakerIcon className="w-5 h-5" />
                     </button>
                     <button 
                       onClick={() => handleCopy(outputText)}
                       className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-slate-600 text-purple-500 dark:text-purple-300"
                       title="Copy"
                     >
                         <CopyIcon className="w-5 h-5" />
                     </button>
                 </div>
             )}
        </div>

      </div>
    </div>
  );
};

export default Translator;
