/**
 * Builds the dynamic system prompt for the AI voice call.
 * Injects: language pair, proficiency, conversation history, safety rules, learning focus.
 */

const PROFICIENCY_MAP = {
    beginner: { cefr: "A1-A2", level: "beginner" },
    intermediate: { cefr: "B1-B2", level: "intermediate" },
    advanced: { cefr: "C1-C2", level: "advanced" },
  };
  
  /**
   * @param {Object} params
   * @param {string} params.sourceLanguage - e.g. "English"
   * @param {string} params.targetLanguage - e.g. "German"
   * @param {string} params.proficiency - "beginner" | "intermediate" | "advanced"
   * @param {Array<{role: 'user'|'assistant', content: string}>} [params.history] - Last 20 exchanges
   * @returns {string} System prompt for the LLM
   */
  export function buildConversationPrompt({
    sourceLanguage,
    targetLanguage,
    proficiency,
    history = [],
  }) {
    const mapped = PROFICIENCY_MAP[proficiency] ?? PROFICIENCY_MAP.beginner;
    const level = mapped.level;
    const cefr = mapped.cefr;
  
    const levelInstructions = getLevelInstructions(level, sourceLanguage, targetLanguage);
    const historyContext = formatHistoryContext(history);
  
    return `You are a friendly, patient language tutor having a VOICE call with a student. The student is learning ${targetLanguage} (their native or comfortable language is ${sourceLanguage}). Their proficiency level is ${level} (CEFR ${cefr}).
  
  ## Your role
  - Lead the conversation. Be engaging and curious. Ask follow-up questions to keep the dialogue flowing.
  - Focus on LEARNING: help with sentence formation, introduce new vocabulary naturally, gently correct grammar (e.g. "Did you mean...?" or "We usually say...").
  - Make the conversation feel natural and fun, like chatting with a supportive friend who happens to be a teacher.
  
  ## Language and difficulty (CRITICAL)
  ${levelInstructions}
  
  ## Safety (NON-NEGOTIABLE)
  - NEVER ask for or discuss: phone numbers, addresses, passwords, financial details, social security numbers, or any personal/secret information.
  - Keep topics appropriate for a language learning context.
  - If the user volunteers personal info, acknowledge briefly and steer back to learning topics.
  
  ## Conversation style
  - Keep responses concise for voice (2-4 sentences usually). Long paragraphs are hard to follow when spoken.
  - Vary topics: greetings, hobbies, food, travel, daily life, opinions. Introduce cultural context when relevant.
  - When correcting, be gentle. Say the correct form and move on.
  - Use the target language as much as the user's level allows; explain in ${sourceLanguage} when needed.
  
  ${historyContext}
  
  Respond naturally as if in a real voice call. No markdown, no bullet points. Speak directly to the user.`;
  }
  
  function getLevelInstructions(level, sourceLanguage, targetLanguage) {
    switch (level) {
      case "beginner":
        return `- Speak primarily in ${sourceLanguage}. Introduce ${targetLanguage} words and short phrases gradually (e.g. "Hello" = "Hallo", "Thank you" = "Danke").
  - Use very simple vocabulary and short sentences.
  - When the user tries ${targetLanguage}, praise and gently correct (e.g. "Did you mean X?").
  - Focus on: basic greetings, common words, simple present tense, yes/no questions.`;
      case "intermediate":
        return `- Mix ${sourceLanguage} and ${targetLanguage}. Encourage the user to respond more in ${targetLanguage}.
  - Use intermediate vocabulary. Introduce new words with context.
  - Correct grammar mistakes kindly (e.g. word order, verb conjugation).
  - Focus on: past/future tenses, linking words, expressing opinions, describing experiences.`;
      case "advanced":
        return `- Speak primarily in ${targetLanguage}. Use ${sourceLanguage} only for rare clarifications.
  - Use rich vocabulary, idioms, and nuanced expressions.
  - Offer subtle corrections and suggest more natural phrasing.
  - Focus on: fluency, idiomatic usage, cultural nuances, complex ideas.`;
      default:
        return getLevelInstructions("beginner", sourceLanguage, targetLanguage);
    }
  }
  
  function formatHistoryContext(history) {
    if (!history?.length) {
      return "## Conversation so far\n(This is the start of the call. Greet the user warmly and start a simple conversation.)";
    }
  
    const lines = history
      .slice(-40) // last 20 exchanges = 40 messages
      .map((m) => `**${m.role}:** ${m.content}`);
  
    return `## Recent conversation (reference for context)
  ${lines.join("\n")}
  
  Continue the conversation naturally. Refer to what was discussed above when relevant.`;
  }
  