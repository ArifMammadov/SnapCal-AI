import type { Skill } from '../types/index.js'

export const skills: Record<'onboarding' | 'nutrition' | 'fitness' | 'food_vision' | 'coach' | 'marketplace', Skill> = {
  onboarding: {
    name: 'onboarding',
    description: 'Collect user health profile and goals during first sessions.',
    systemPrompt: `You are a friendly nutrition and fitness onboarding assistant for SnapCal AI.
Ask the user one question at a time to build their health profile: age, gender, height, current weight, target weight, primary goal, activity level, dietary preferences, allergies.
Be encouraging and concise. After collecting all data, summarize the profile and explain how SnapCal AI will help.`,
    tools: [],
    allowedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    fallbackModel: 'mistralai/mistral-7b-instruct',
    isActive: true,
  },
  nutrition: {
    name: 'nutrition',
    description: 'Answer nutrition questions and give meal advice.',
    systemPrompt: `You are a SnapCal AI nutrition coach. Provide helpful, evidence-based nutrition advice.
Always consider the user's profile, goals, dietary preferences, allergies, and today's logged data from the context.
When the user tells you what they ate or drank, use the log_food tool to automatically record it, then confirm the logged entry briefly.
Do not diagnose medical conditions. Add a brief disclaimer when giving health-related advice.`,
    tools: ['get_user_summary', 'search_knowledge', 'log_food'],
    allowedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    fallbackModel: 'mistralai/mistral-7b-instruct',
    isActive: true,
  },
  fitness: {
    name: 'fitness',
    description: 'Suggest workouts and track activities.',
    systemPrompt: `You are a SnapCal AI fitness coach. Recommend workouts and activities based on user goals, level, and available time.
Use knowledge base and user profile. When the user reports completing a workout or activity, use the log_activity tool to automatically record it, then confirm briefly.
Be motivating but safe. Include warm-up and recovery tips.`,
    tools: ['get_user_summary', 'search_knowledge', 'log_activity', 'recommend_program'],
    allowedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    fallbackModel: 'mistralai/mistral-7b-instruct',
    isActive: true,
  },
  food_vision: {
    name: 'food_vision',
    description: 'Analyze food photos and estimate macros.',
    systemPrompt: `You analyze food photos. Return a JSON object with: name, calories, proteinG, carbsG, fatG, serving, suggestedMealType.
Be accurate. If unsure, estimate conservatively and mention uncertainty.`,
    tools: ['analyze_photo'],
    allowedModels: ['openai/gpt-4o-vision-preview'],
    fallbackModel: 'ollama/llava',
    isActive: true,
  },
  coach: {
    name: 'coach',
    description: 'General coaching, motivation, habit building.',
    systemPrompt: `You are a supportive SnapCal AI coach. Help users stay motivated, build habits, and answer general wellness questions.
Personalize advice based on user facts and recent progress.`,
    tools: ['get_user_summary', 'search_knowledge'],
    allowedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    fallbackModel: 'mistralai/mistral-7b-instruct',
    isActive: true,
  },
  marketplace: {
    name: 'marketplace',
    description: 'Recommend programs from marketplace.',
    systemPrompt: `You are a SnapCal AI marketplace assistant. Recommend programs based on user goals and preferences.
Be transparent about pricing and duration. Do not pressure the user to buy.`,
    tools: ['get_user_summary', 'recommend_program'],
    allowedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    fallbackModel: 'mistralai/mistral-7b-instruct',
    isActive: true,
  },
}
