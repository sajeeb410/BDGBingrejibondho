
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Difficulty, LessonData, QuestionType, DictionaryResult } from '../types';
import { TOPICS } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const lessonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: "The English topic identifier (e.g., 'greetings')" },
    title: { type: Type.STRING, description: "The lesson title in Bengali" },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { 
            type: Type.STRING, 
            enum: [
              QuestionType.TranslateToEnglish, 
              QuestionType.TranslateToBengali, 
              QuestionType.FillBlank,
              QuestionType.Pronunciation,
              QuestionType.WordBuilder
            ] 
          },
          questionText: { type: Type.STRING, description: "The phrase to translate, the sentence with a blank, or the English phrase to pronounce." },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "For Translate/FillBlank: 4 plausible answers. For Pronunciation: The target sentence only. For WordBuilder: An array of single characters representing the scrambled letters of the correct English word." 
          },
          correctAnswer: { type: Type.STRING, description: "The exact string that is correct." },
          explanation: { type: Type.STRING, description: "A short explanation in Bengali why this is correct." }
        },
        required: ["id", "type", "questionText", "options", "correctAnswer", "explanation"]
      }
    }
  },
  required: ["topic", "title", "questions"]
};

const dictionarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    phonetic: { type: Type.STRING, description: "IPA or simple phonetic pronunciation" },
    meaning: { type: Type.STRING, description: "Meaning in Bengali" },
    definition: { type: Type.STRING, description: "Definition in English" },
    examples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 example sentences using the word, suitable for the learner's level." },
    synonyms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Up to 3 synonyms" },
    pronunciationTip: { type: Type.STRING, description: "A short guide in Bengali on how to pronounce the word, perhaps writing the sound in Bengali script (e.g., 'উচ্চারণ: অ্যাড-ভেন-চার')." }
  },
  required: ["word", "meaning", "definition", "examples", "synonyms", "pronunciationTip"]
};

export const generateLesson = async (difficulty: Difficulty, topic: string): Promise<LessonData> => {
  const cacheKey = `ib_lesson_${difficulty}_${topic}`;

  // Try to load from cache first
  try {
    const cachedLesson = localStorage.getItem(cacheKey);
    if (cachedLesson) {
      return JSON.parse(cachedLesson) as LessonData;
    }
  } catch (e) {
    console.warn("Failed to load lesson from cache:", e);
  }

  let prompt = '';

  if (topic === 'word_formation') {
    // Specific instructional prompt for Word Formation
    prompt = `
      You are a friendly Bengali-speaking English teacher. The user wants to learn **English Word Formation** (Roots, Prefixes, Suffixes).
      
      Create a 5-step lesson. For each step, provide a short teaching explanation in simple Bengali, followed by a question to test understanding.

      Structure the 5 questions as follows:
      1. **Root Words**: Explain that a root is the main part of a word (e.g., 'Act' in 'Action'). Question Type: Multiple Choice (TranslateToBengali/English). Ask user to identify the root or meaning.
      2. **Prefixes**: Explain what a prefix is (e.g., 'Un-', 'Re-'). Show an example (Happy -> Unhappy). Question Type: FillBlank. (e.g., "I am not happy. I am ___happy").
      3. **Suffixes**: Explain what a suffix is (e.g., '-er', '-ful'). Show an example (Teach -> Teacher). Question Type: FillBlank or Multiple Choice.
      4. **Practice (Prefix)**: Use QuestionType 'word_builder'. Give the Bengali meaning of a word with a prefix (e.g., "অসুস্থ - Unwell") and scrambled letters.
      5. **Practice (Suffix)**: Use QuestionType 'word_builder'. Give the Bengali meaning of a word with a suffix (e.g., "গায়ক - Singer") and scrambled letters.

      General Rules:
      - Tone: Encouraging, simple, non-technical.
      - In 'questionText', put the Teaching Explanation first (followed by a newline), then the Question.
      - Ensure 'options' are relevant.
    `;
  } else {
    // Standard prompt for other topics
    prompt = `
      Create a fun and engaging English lesson for a Bengali speaker.
      Target Audience Level: ${difficulty}.
      Topic: ${topic}.
      
      Generate 5 questions.
      
      1. If Difficulty is Beginner:
         - PRIORITIZE 'word_builder' type questions for vocabulary building. 
         - Ask the user to form basic English words from scrambled letters based on the Bengali meaning.
      
      2. Otherwise, include a mix of:
         - Translating Bengali to English
         - Translating English to Bengali
         - Fill in the Blanks
         - Pronunciation practice
         - Word Builder (Arrange letters to form a word)

      3. Ensure the Bengali is natural and colloquial.
      4. Ensure the English is grammatically correct.
      5. Options should be plausible but clearly distinguishable.
      6. The 'explanation' field MUST be in Bengali.
      7. For 'word_builder':
         - 'questionText' should be the Bengali word (and optional hint).
         - 'correctAnswer' is the correct English word.
         - 'options' MUST be an array of single uppercase characters that form the word, shuffled randomly.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: lessonSchema,
        systemInstruction: "You are a friendly bilingual English teacher for Bengali students. You make learning fun."
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No content generated");
    }
    
    const lessonData = JSON.parse(text) as LessonData;

    // Save to cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(lessonData));
    } catch (e) {
      console.warn("Failed to save lesson to cache:", e);
    }

    return lessonData;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback data in case of API failure or quota limits
    return {
      topic: "fallback",
      title: "শব্দ গঠন (Word Formation Basics)",
      questions: [
        {
          id: "1",
          type: QuestionType.FillBlank,
          questionText: "শব্দের মূল অংশকে Root Word বলে। যেমন: 'Play' (খেলা)।\nপ্রশ্ন: 'Player' শব্দটির Root Word কোনটি?",
          options: ["Play", "Er", "Layer", "Player"],
          correctAnswer: "Play",
          explanation: "এখানে 'Play' হলো মূল শব্দ, আর 'er' হলো Suffix।"
        },
        {
          id: "2",
          type: QuestionType.FillBlank,
          questionText: "Prefix শব্দের শুরুতে বসে অর্থ বদলে দেয়। যেমন: Happy (সুখী) -> Unhappy (অসুখী)।\nপ্রশ্ন: 'Possible' (সম্ভব) এর বিপরীত করতে কোন Prefix বসবে?\nIt is ___possible.",
          options: ["Un", "Im", "Dis", "Non"],
          correctAnswer: "Im",
          explanation: "Possible এর আগে 'Im' বসলে হয় Impossible (অসম্ভব)।"
        },
        {
           id: "3",
           type: QuestionType.WordBuilder,
           questionText: "Suffix শব্দের শেষে বসে। যেমন: Care + ful = Careful (সতর্ক)।\nশব্দটি তৈরি করুন: (সাহায্যকারী) Help + ful",
           options: ["H", "E", "L", "P", "F", "U", "L"],
           correctAnswer: "HELPFUL",
           explanation: "Help (সাহায্য) এর সাথে ful যোগ করলে Helpful হয়।"
        }
      ]
    };
  }
};

export const downloadLevelLessons = async (
  difficulty: Difficulty, 
  onProgress: (completed: number, total: number) => void
) => {
  const topics = TOPICS[difficulty];
  let completed = 0;
  
  for (const topic of topics) {
    const cacheKey = `ib_lesson_${difficulty}_${topic.id}`;
    
    // Only fetch if not already cached
    if (!localStorage.getItem(cacheKey)) {
        const data = await generateLesson(difficulty, topic.id);
        
        // If we hit the fallback due to error/offline/limits, ensure we don't permanently cache it as the "real" lesson
        // and stop the bulk download process to save resources/time.
        if (data.topic === 'fallback') {
             // uncache the fallback so user can try again later
             localStorage.removeItem(cacheKey); 
             throw new Error("API Limit or Connection Error. Stopping download.");
        }
        
        // Slight delay to be polite to the rate limiter
        await new Promise(r => setTimeout(r, 1000));
    }
    
    completed++;
    onProgress(completed, topics.length);
  }
};

export const lookupWord = async (word: string, level: string = 'A1 (Beginner)'): Promise<DictionaryResult> => {
  const prompt = `
    Provide the definition of the English word: "${word}" for a Bengali speaker.
    Target English Proficiency Level: ${level}.
    
    Include:
    1. Phonetic pronunciation.
    2. Meaning in Bengali.
    3. Definition in English: IMPORTANT - The definition MUST be simple and easy to understand for a learner at the ${level} level. Avoid using complex words in the definition itself.
    4. 2-3 Example sentences using the word (Must be suitable for ${level} level).
    5. A few synonyms (Advanced synonyms if level is high).
    6. A short tip in Bengali on how to pronounce it correctly (write the sound in Bengali script).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: dictionarySchema,
        systemInstruction: "You are an English-Bengali Dictionary helper. You excel at explaining complex words simply to learners."
      }
    });
    
    if (!response.text) throw new Error("No definition found");
    return JSON.parse(response.text) as DictionaryResult;
  } catch (error) {
    console.error("Dictionary Error:", error);
    throw error;
  }
};

export const checkSentence = async (word: string, sentence: string): Promise<string> => {
    const prompt = `
      The user is an English learner trying to use the word "${word}" in a sentence.
      User's sentence: "${sentence}"
      
      Analyze the sentence. 
      - Is it grammatically correct?
      - Is the word "${word}" used correctly in context?
      
      Provide a helpful response in Bengali.
      - If correct, praise them (e.g., "চমৎকার!").
      - If incorrect, kindly explain the mistake and show the corrected sentence.
      - Keep the response brief and encouraging (under 30 words).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "দুঃখিত, যাচাই করা সম্ভব হয়নি।";
    } catch (e) {
        console.error("Sentence Check Error", e);
        return "ত্রুটি হয়েছে। আবার চেষ্টা করুন।";
    }
};

export const translateText = async (text: string, direction: 'bn-en' | 'en-bn'): Promise<string> => {
    const prompt = `
      Translate the following text strictly from ${direction === 'bn-en' ? 'Bengali to English' : 'English to Bengali'}.
      Original Text: "${text}"
      
      Requirements:
      1. The translation must be natural, grammatically correct, and easy to understand.
      2. If the text is informal/slang, translate it to an equivalent colloquial form if possible, but prioritize clarity.
      3. Return ONLY the translated text string. No explanations or extra quotes.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text?.trim() || "Translation failed.";
    } catch (e) {
        console.error("Translation Error", e);
        return "ত্রুটি হয়েছে। আবার চেষ্টা করুন।";
    }
};
