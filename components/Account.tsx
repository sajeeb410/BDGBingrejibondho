
import React, { useRef, useState } from 'react';
import { UserState, Difficulty } from '../types';
import { UserIcon, DownloadIcon, UploadIcon, FireIcon, StarIcon, BookIcon, TrashIcon, WifiIcon } from './Icons';
import { downloadLevelLessons } from '../services/geminiService';

interface AccountProps {
  userState: UserState;
  onUpdateUser: (newState: Partial<UserState>) => void;
  onImportProgress: (data: UserState) => void;
  onReset: () => void;
}

const Account: React.FC<AccountProps> = ({ userState, onUpdateUser, onImportProgress, onReset }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(userState.username);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Download State
  const [downloadStatus, setDownloadStatus] = useState<{level: string, progress: number, total: number} | null>(null);

  const handleSaveName = () => {
    onUpdateUser({ username: tempName });
    setIsEditing(false);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(userState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ingreji_bondhu_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = e.target?.result as string;
              const data = JSON.parse(json);
              // Basic validation
              if (data && typeof data.xp === 'number' && typeof data.hearts === 'number') {
                  if (confirm("This will overwrite your current progress. Are you sure? (এটি আপনার বর্তমান অগ্রগতি মুছে ফেলবে। আপনি কি নিশ্চিত?)")) {
                      onImportProgress(data);
                  }
              } else {
                  alert("Invalid backup file. (ভুল ফাইল)");
              }
          } catch (err) {
              console.error("Import error", err);
              alert("Error reading file. (ফাইল পড়তে সমস্যা হয়েছে)");
          }
      };
      reader.readAsText(file);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleResetClick = () => {
      if (confirm("Are you sure you want to reset all progress? This cannot be undone. (আপনি কি নিশ্চিত যে আপনি সব অগ্রগতি মুছে ফেলতে চান?)")) {
          onReset();
      }
  };

  const handleDownloadLessons = async (level: Difficulty) => {
      if (downloadStatus) return; // Busy
      
      setDownloadStatus({ level, progress: 0, total: 1 }); // Init
      try {
          await downloadLevelLessons(level, (completed, total) => {
              setDownloadStatus({ level, progress: completed, total });
          });
          alert(`Successfully downloaded all ${level} lessons! (সকল পাঠ ডাউনলোড সম্পন্ন হয়েছে!)`);
      } catch (e: any) {
          alert(`Download failed: ${e.message || "Unknown error"}`);
      } finally {
          setDownloadStatus(null);
      }
  };

  return (
    <div className="max-w-md mx-auto w-full p-4 flex flex-col min-h-[80vh] pb-20 pb-safe-bottom">
       <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors duration-300">
           <div className="flex items-center gap-2 mb-6 text-slate-700 dark:text-white">
               <UserIcon className="w-6 h-6 text-blue-500" />
               <h2 className="text-xl font-bold">My Account (অ্যাকাউন্ট)</h2>
           </div>

           {/* Profile Header */}
           <div className="flex flex-col items-center mb-8">
               <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                   <UserIcon className="w-10 h-10 text-blue-500 dark:text-blue-300" />
               </div>
               
               {isEditing ? (
                   <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={tempName}
                         onChange={(e) => setTempName(e.target.value)}
                         className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1 bg-gray-50 dark:bg-slate-700 text-slate-800 dark:text-white"
                       />
                       <button onClick={handleSaveName} className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-bold">Save</button>
                   </div>
               ) : (
                   <div className="flex items-center gap-2">
                       <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{userState.username || "Guest"}</h3>
                       <button onClick={() => setIsEditing(true)} className="text-xs text-blue-500 font-bold hover:underline">Edit</button>
                   </div>
               )}
               <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{userState.level} Level</p>
           </div>

           {/* Stats Grid */}
           <div className="grid grid-cols-3 gap-3 mb-8">
               <div className="bg-gray-50 dark:bg-slate-750 p-3 rounded-xl text-center border border-gray-100 dark:border-slate-700">
                   <StarIcon className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                   <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{userState.xp}</p>
                   <p className="text-xs text-gray-400 font-bold uppercase">XP</p>
               </div>
               <div className="bg-gray-50 dark:bg-slate-750 p-3 rounded-xl text-center border border-gray-100 dark:border-slate-700">
                   <FireIcon className="w-6 h-6 text-orange-500 mx-auto mb-1" fill={userState.streak > 0} />
                   <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{userState.streak}</p>
                   <p className="text-xs text-gray-400 font-bold uppercase">Day Streak</p>
               </div>
               <div className="bg-gray-50 dark:bg-slate-750 p-3 rounded-xl text-center border border-gray-100 dark:border-slate-700">
                   <BookIcon className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                   <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{userState.completedLessons.length}</p>
                   <p className="text-xs text-gray-400 font-bold uppercase">Lessons</p>
               </div>
           </div>

           {/* Offline Access Section */}
           <div className="space-y-4 mb-8">
               <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-2">
                   <WifiIcon className="w-4 h-4" />
                   Offline Access (অফলাইন)
               </h4>
               <p className="text-xs text-gray-500 dark:text-gray-400">
                   Download lessons to practice without internet. (ইন্টারনেট ছাড়া প্র্যাকটিস করতে লেসন ডাউনলোড করুন)
               </p>
               
               <div className="grid grid-cols-1 gap-2">
                   {Object.values(Difficulty).map((diff) => (
                       <button
                           key={diff}
                           onClick={() => handleDownloadLessons(diff)}
                           disabled={downloadStatus !== null}
                           className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                               downloadStatus?.level === diff 
                                 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' 
                                 : 'bg-white dark:bg-slate-750 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                           } disabled:opacity-50`}
                       >
                           <div className="flex items-center gap-3">
                               <DownloadIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                               <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{diff} Lessons</span>
                           </div>
                           
                           {downloadStatus?.level === diff ? (
                               <div className="flex flex-col items-end">
                                   <span className="text-xs font-bold text-blue-500">
                                       {Math.round((downloadStatus.progress / downloadStatus.total) * 100)}%
                                   </span>
                                   <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                                       <div 
                                           className="bg-blue-500 h-1 rounded-full transition-all" 
                                           style={{ width: `${(downloadStatus.progress / downloadStatus.total) * 100}%` }}
                                       ></div>
                                   </div>
                               </div>
                           ) : (
                               <span className="text-xs text-blue-500 font-bold">Download</span>
                           )}
                       </button>
                   ))}
               </div>
           </div>

           {/* Data Management */}
           <div className="space-y-4">
               <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Data & Progress</h4>
               
               <button 
                 onClick={handleExport}
                 className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-750 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 transition-colors"
               >
                   <div className="flex items-center gap-3">
                       <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400">
                           <DownloadIcon className="w-5 h-5" />
                       </div>
                       <div className="text-left">
                           <p className="font-bold text-slate-700 dark:text-slate-200">Save Progress</p>
                           <p className="text-xs text-gray-500">Download backup file</p>
                       </div>
                   </div>
               </button>

               <button 
                 onClick={handleImportClick}
                 className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-750 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 transition-colors"
               >
                   <div className="flex items-center gap-3">
                       <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                           <UploadIcon className="w-5 h-5" />
                       </div>
                       <div className="text-left">
                           <p className="font-bold text-slate-700 dark:text-slate-200">Load Progress</p>
                           <p className="text-xs text-gray-500">Restore from backup</p>
                       </div>
                   </div>
               </button>
               <input 
                 type="file" 
                 accept=".json" 
                 ref={fileInputRef} 
                 className="hidden" 
                 onChange={handleFileChange}
               />

               <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-700">
                    <button 
                        onClick={handleResetClick}
                        className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-bold text-sm"
                    >
                        <TrashIcon className="w-4 h-4" />
                        Reset All Progress
                    </button>
               </div>
           </div>
       </div>
    </div>
  );
};

export default Account;
