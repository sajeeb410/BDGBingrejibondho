
import React from 'react';
import { Difficulty, UserState } from '../types';
import { StarIcon, BookIcon, UserIcon, FireIcon } from './Icons';
import { TOPICS } from '../constants';

interface DashboardProps {
  userState: UserState;
  onSelectTopic: (difficulty: Difficulty, topic: string) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userState, onSelectTopic, onDifficultyChange }) => {
  const currentTopics = TOPICS[userState.level];

  // Find index of first incomplete lesson for the Avatar position
  let currentLessonIndex = currentTopics.findIndex(
    t => !userState.completedLessons.includes(`${userState.level}-${t.id}`)
  );
  if (currentLessonIndex === -1) currentLessonIndex = currentTopics.length; // All done

  // Coordinate System Constants
  const VERTICAL_SPACING = 140;
  const VIEWBOX_WIDTH = 400; 
  const CENTER_X = VIEWBOX_WIDTH / 2;
  const AMPLITUDE = 100; // How wide the path winds

  const getTopicCoords = (index: number) => {
      const y = (index + 0.5) * VERTICAL_SPACING + 40; // Add top padding
      // Sine wave pattern: Center -> Right -> Center -> Left
      // using index to drive the sine wave. 
      // 0 -> 0, 1 -> 1, 2 -> 0, 3 -> -1
      const x = CENTER_X + Math.sin(index * Math.PI / 2) * AMPLITUDE;
      return { x, y };
  };

  const totalHeight = (currentTopics.length) * VERTICAL_SPACING + 150;

  return (
    <div className="max-w-md mx-auto w-full pb-20 relative bg-green-50/50 dark:bg-slate-900 min-h-full">
      
      {/* Sticky Difficulty Selector */}
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 shadow-sm sticky top-[4rem] sm:top-16 z-30 border-b border-gray-100 dark:border-slate-700 transition-colors duration-300">
        <div className="flex justify-between space-x-2">
          {(Object.values(Difficulty) as Difficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => onDifficultyChange(diff)}
              className={`flex-1 py-2 px-1 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                userState.level === diff
                  ? 'bg-blue-500 text-white shadow-md transform scale-105'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Roadmap Container */}
      <div className="relative w-full overflow-hidden" style={{ height: totalHeight }}>
        
        {/* SVG Path Layer */}
        <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" 
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${totalHeight}`}
            preserveAspectRatio="xMidYMin slice"
        >
           {/* Draw segments between nodes */}
           {currentTopics.map((topic, i) => {
               if (i === currentTopics.length - 1) return null;
               
               const start = getTopicCoords(i);
               const end = getTopicCoords(i + 1);
               const midY = (start.y + end.y) / 2;
               
               // Bezier Control Points
               const cp1 = { x: start.x, y: midY };
               const cp2 = { x: end.x, y: midY };

               const d = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
               
               // Determine color: Gold if 'start' node is completed (path traveled), else Gray
               const isPathActive = userState.completedLessons.includes(`${userState.level}-${topic.id}`);

               return (
                   <g key={`path-${i}`}>
                        {/* Shadow path for depth */}
                        <path d={d} stroke="rgba(0,0,0,0.1)" strokeWidth="16" fill="none" strokeLinecap="round" transform="translate(0, 4)" />
                        {/* Main path */}
                        <path 
                            d={d} 
                            stroke={isPathActive ? "#fbbf24" : "#e2e8f0"} 
                            className="transition-colors duration-500 dark:stroke-slate-700"
                            strokeWidth="12" 
                            fill="none" 
                            strokeLinecap="round" 
                            strokeDasharray={isPathActive ? "0" : "20 10"}
                        />
                   </g>
               );
           })}
        </svg>

        {/* Start Flag */}
        <div 
            className="absolute z-10 font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-xs"
            style={{ 
                left: '50%', 
                top: '20px', 
                transform: 'translateX(-50%)' 
            }}
        >
            Start
        </div>

        {/* Nodes Layer */}
        {currentTopics.map((topic, index) => {
            const coords = getTopicCoords(index);
            const isCompleted = userState.completedLessons.includes(`${userState.level}-${topic.id}`);
            // A node is locked if it's not the first one AND the previous one is not completed
            const isLocked = index > 0 && !userState.completedLessons.includes(`${userState.level}-${currentTopics[index-1].id}`);
            const isCurrent = index === currentLessonIndex;

            // Convert SVG coords to CSS percentage approximations for responsiveness, 
            // or just use absolute pixels since container is controlled.
            // Using pixels relative to container matches the SVG perfectly.
            
            // Adjust for node size (e.g. 80x80) center anchor
            const nodeSize = 88;
            const leftPos = `calc(50% + ${coords.x - CENTER_X}px)`; // Relative to center
            const topPos = coords.y;

            return (
                <div 
                    key={topic.id}
                    className="absolute flex flex-col items-center justify-center z-10"
                    style={{ 
                        left: leftPos, 
                        top: topPos,
                        width: nodeSize,
                        height: nodeSize,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    {/* Floating Avatar for Current Level */}
                    {isCurrent && (
                        <div className="absolute -top-16 animate-bounce z-20">
                           <div className="bg-white dark:bg-slate-700 p-1 rounded-full shadow-lg border-2 border-blue-500">
                               <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                  {userState.avatar ? (
                                      <span className="text-xl">{userState.avatar}</span>
                                  ) : (
                                      <UserIcon className="w-6 h-6 text-blue-500" />
                                  )}
                               </div>
                           </div>
                           <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-500 mx-auto mt-[-2px]"></div>
                        </div>
                    )}

                    {/* Node Circle */}
                    <button
                        onClick={() => !isLocked && onSelectTopic(userState.level, topic.id)}
                        disabled={isLocked}
                        className={`
                            relative w-full h-full rounded-full flex items-center justify-center border-b-8 transition-transform active:border-b-0 active:translate-y-2
                            ${isLocked 
                                ? 'bg-gray-200 dark:bg-slate-800 border-gray-300 dark:border-slate-700 cursor-not-allowed text-gray-400' 
                                : isCompleted 
                                    ? 'bg-yellow-400 border-yellow-600 shadow-yellow-200 dark:shadow-none' 
                                    : 'bg-blue-500 border-blue-700 hover:bg-blue-400 shadow-blue-200 dark:shadow-none'
                            }
                        `}
                    >
                        {isCompleted ? (
                             <StarIcon className="w-10 h-10 text-white" fill />
                        ) : isLocked ? (
                             <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400"></div>
                        ) : (
                             <BookIcon className="w-10 h-10 text-white" />
                        )}
                        
                        {/* Stars for score/mastery could go here */}
                        {isCompleted && (
                            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-700 rounded-full p-1 border border-yellow-400 shadow-sm">
                                <StarIcon className="w-3 h-3 text-yellow-500" />
                            </div>
                        )}
                    </button>

                    {/* Topic Label */}
                    <div className="absolute top-24 w-40 text-center pointer-events-none">
                        <p className={`text-sm font-bold ${isLocked ? 'text-gray-400' : 'text-slate-700 dark:text-white'} bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-lg px-2 py-0.5 inline-block`}>
                            {topic.name}
                        </p>
                        <p className={`text-xs ${isLocked ? 'text-gray-300' : 'text-slate-500 dark:text-slate-400'} bengali-text`}>
                            {topic.label}
                        </p>
                    </div>
                </div>
            );
        })}
        
        {/* End Trophy */}
        <div 
            className="absolute flex flex-col items-center justify-center opacity-50 grayscale"
            style={{
                left: '50%',
                top: totalHeight - 80,
                transform: 'translate(-50%, -50%)'
            }}
        >
             <div className="w-24 h-24 bg-gradient-to-t from-yellow-200 to-yellow-100 rounded-full flex items-center justify-center border-4 border-yellow-300">
                 <FireIcon className="w-12 h-12 text-yellow-600" fill />
             </div>
             <p className="mt-2 font-bold text-gray-400 uppercase tracking-widest text-xs">Level Master</p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
