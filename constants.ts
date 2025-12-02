
import { Difficulty } from './types';

export const TOPICS = {
  [Difficulty.Beginner]: [
    { id: 'word_formation', name: 'Word Building', label: 'শব্দ গঠন (Spelling)' },
    { id: 'greetings', name: 'Greetings & Basics', label: 'শুভেচ্ছা ও প্রাথমিক' },
    { id: 'family', name: 'Family', label: 'পরিবার' },
    { id: 'food', name: 'Food & Drink', label: 'খাবার ও পানীয়' },
    { id: 'colors', name: 'Colors & Numbers', label: 'রং এবং সংখ্যা' },
    { id: 'shapes', name: 'Shapes', label: 'আকৃতি' },
    { id: 'objects', name: 'Common Objects', label: 'সাধারণ বস্তু' },
    { id: 'actions', name: 'Actions (Verbs)', label: 'কাজ বা ক্রিয়া' },
    { id: 'routines', name: 'Daily Routines', label: 'দৈনন্দিন রুটিন' },
    { id: 'animals', name: 'Animals', label: 'পশুপাখি' },
    { id: 'weather', name: 'Weather', label: 'আবহাওয়া' },
    { id: 'house', name: 'My House', label: 'আমার বাড়ি' },
  ],
  [Difficulty.Intermediate]: [
    { id: 'travel', name: 'Travel', label: 'ভ্রমণ' },
    { id: 'work', name: 'Work & Career', label: 'কাজ এবং পেশা' },
    { id: 'emotions', name: 'Feelings', label: 'অনুভূতি' },
    { id: 'past_tense', name: 'Past Events', label: 'অতীতের ঘটনা' },
    { id: 'hobbies', name: 'Hobbies', label: 'শখ' },
    { id: 'shopping', name: 'Shopping', label: 'কেনাকাটা' },
    { id: 'health', name: 'Health', label: 'স্বাস্থ্য' },
    { id: 'education', name: 'Education', label: 'শিক্ষা' },
  ],
  [Difficulty.Advanced]: [
    { id: 'business', name: 'Business', label: 'ব্যবসায়' },
    { id: 'politics', name: 'News & Politics', label: 'সংবাদ ও রাজনীতি' },
    { id: 'science', name: 'Technology', label: 'প্রযুক্তি' },
    { id: 'debates', name: 'Opinions', label: 'মতামত' },
    { id: 'environment', name: 'Environment', label: 'পরিবেশ' },
    { id: 'literature', name: 'Literature', label: 'সাহিত্য' },
    { id: 'global_issues', name: 'Global Issues', label: 'বিশ্বের সমস্যা' },
    { id: 'culture', name: 'Cultural Differences', label: 'সাংস্কৃতিক পার্থক্য' },
    { id: 'idioms', name: 'Idioms & Slang', label: 'বাগধারা ও অপভাষা' },
    { id: 'adv_grammar', name: 'Advanced Grammar', label: 'উন্নত ব্যাকরণ' },
  ],
};
