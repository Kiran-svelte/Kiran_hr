/**
 * Multi-LLM AI Gateway with Failover
 * Supports Groq, SambaNova, and Gemini with circuit breaker pattern
 */

import { getSystemPrompt } from './ai-prompts';

// LLM Provider Configuration
interface LLMProvider {
  name: string;
  apiKey: string;
  model: string;
  endpoint: string;
  priority: number;
  failureCount: number;
  lastFailure?: Date;
  isAvailable: boolean;
}

// Circuit breaker thresholds
const MAX_FAILURES = 5;
const COOLDOWN_PERIOD = 60000; // 1 minute in milliseconds

// In-memory cache for responses (upgrade to Redis in production)
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

// Provider configurations
const providers: LLMProvider[] = [
  {
    name: 'groq',
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    priority: 1,
    failureCount: 0,
    isAvailable: true
  },
  {
    name: 'sambanova',
    apiKey: process.env.SAMBANOVA_API_KEY || '',
    model: process.env.SAMBANOVA_MODEL || 'Meta-Llama-3.1-8B-Instruct',
    endpoint: 'https://api.sambanova.ai/v1/chat/completions',
    priority: 2,
    failureCount: 0,
    isAvailable: true
  },
  {
    name: 'gemini',
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-pro',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
    priority: 3,
    failureCount: 0,
    isAvailable: true
  }
];

/**
 * Circuit breaker check - disable provider after too many failures
 */
function checkCircuitBreaker(provider: LLMProvider): boolean {
  if (provider.failureCount >= MAX_FAILURES) {
    const now = Date.now();
    const lastFailureTime = provider.lastFailure?.getTime() || 0;
    
    if (now - lastFailureTime > COOLDOWN_PERIOD) {
      // Reset after cooldown period
      provider.failureCount = 0;
      provider.isAvailable = true;
      console.log(`[AI Gateway] Circuit breaker reset for ${provider.name}`);
      return true;
    }
    
    provider.isAvailable = false;
    return false;
  }
  
  return provider.isAvailable;
}

/**
 * Record a failure for a provider
 */
function recordFailure(provider: LLMProvider) {
  provider.failureCount++;
  provider.lastFailure = new Date();
  
  if (provider.failureCount >= MAX_FAILURES) {
    provider.isAvailable = false;
    console.warn(`[AI Gateway] Circuit breaker opened for ${provider.name}`);
  }
}

/**
 * Record a success for a provider
 */
function recordSuccess(provider: LLMProvider) {
  if (provider.failureCount > 0) {
    provider.failureCount = Math.max(0, provider.failureCount - 1);
  }
}

/**
 * Generate cache key for request
 */
function getCacheKey(module: string, messages: any[]): string {
  const content = messages.map(m => m.content).join('|');
  return `${module}:${content}`;
}

/**
 * Check cache for response
 */
function getCachedResponse(cacheKey: string): string | null {
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    responseCache.delete(cacheKey);
    return null;
  }
  
  return cached.response;
}

/**
 * Cache a response
 */
function cacheResponse(cacheKey: string, response: string) {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
  
  // Simple cache size management
  if (responseCache.size > 100) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
}

/**
 * Call Groq API
 */
async function callGroq(provider: LLMProvider, messages: any[]): Promise<string> {
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  
  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Call SambaNova API
 */
async function callSambaNova(provider: LLMProvider, messages: any[]): Promise<string> {
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  
  if (!response.ok) {
    throw new Error(`SambaNova API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Call Gemini API
 */
async function callGemini(provider: LLMProvider, messages: any[]): Promise<string> {
  // Convert messages to Gemini format
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
  
  const endpoint = `${provider.endpoint}${provider.model}:generateContent?key=${provider.apiKey}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || '';
}

/**
 * Call the appropriate LLM provider
 */
async function callProvider(provider: LLMProvider, messages: any[]): Promise<string> {
  switch (provider.name) {
    case 'groq':
      return await callGroq(provider, messages);
    case 'sambanova':
      return await callSambaNova(provider, messages);
    case 'gemini':
      return await callGemini(provider, messages);
    default:
      throw new Error(`Unknown provider: ${provider.name}`);
  }
}

/**
 * Main AI Gateway function with failover
 */
export async function callAI(
  module: keyof typeof import('./ai-prompts').AI_PROMPTS,
  userMessage: string,
  context?: Record<string, any>
): Promise<{
  success: boolean;
  response?: string;
  provider?: string;
  error?: string;
  cached?: boolean;
}> {
  const systemPrompt = getSystemPrompt(module);
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...(context ? [{ role: 'system', content: `Context: ${JSON.stringify(context)}` }] : []),
    { role: 'user', content: userMessage }
  ];
  
  // Check cache first
  const cacheKey = getCacheKey(module, messages);
  const cachedResponse = getCachedResponse(cacheKey);
  
  if (cachedResponse) {
    console.log(`[AI Gateway] Cache hit for ${module}`);
    return {
      success: true,
      response: cachedResponse,
      cached: true
    };
  }
  
  // Sort providers by priority
  const availableProviders = providers
    .filter(p => checkCircuitBreaker(p))
    .sort((a, b) => a.priority - b.priority);
  
  if (availableProviders.length === 0) {
    return {
      success: false,
      error: 'All AI providers are currently unavailable'
    };
  }
  
  // Try each provider in order
  for (const provider of availableProviders) {
    try {
      console.log(`[AI Gateway] Attempting ${provider.name} for ${module}`);
      const startTime = Date.now();
      
      const response = await callProvider(provider, messages);
      
      const latency = Date.now() - startTime;
      console.log(`[AI Gateway] ${provider.name} responded in ${latency}ms`);
      
      recordSuccess(provider);
      cacheResponse(cacheKey, response);
      
      return {
        success: true,
        response,
        provider: provider.name
      };
    } catch (error) {
      console.error(`[AI Gateway] ${provider.name} failed:`, error);
      recordFailure(provider);
      
      // Continue to next provider
      continue;
    }
  }
  
  return {
    success: false,
    error: 'All AI providers failed to respond'
  };
}

/**
 * Parse JSON response from AI (with error handling)
 */
export function parseAIResponse<T = any>(response: string): T | null {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                      response.match(/```\n([\s\S]*?)\n```/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to parse directly
    return JSON.parse(response);
  } catch (error) {
    console.error('[AI Gateway] Failed to parse AI response as JSON:', error);
    return null;
  }
}

/**
 * Get status of all providers
 */
export function getProviderStatus() {
  return providers.map(p => ({
    name: p.name,
    isAvailable: p.isAvailable,
    failureCount: p.failureCount,
    lastFailure: p.lastFailure
  }));
}

/**
 * Streaming AI response (for chat)
 */
export async function streamAI(
  module: keyof typeof import('./ai-prompts').AI_PROMPTS,
  userMessage: string,
  context?: Record<string, any>
): Promise<ReadableStream<Uint8Array> | null> {
  const systemPrompt = getSystemPrompt(module);
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...(context ? [{ role: 'system', content: `Context: ${JSON.stringify(context)}` }] : []),
    { role: 'user', content: userMessage }
  ];
  
  // Get first available provider
  const provider = providers
    .filter(p => checkCircuitBreaker(p))
    .sort((a, b) => a.priority - b.priority)[0];
  
  if (!provider) {
    return null;
  }
  
  try {
    // Only Groq and SambaNova support streaming (OpenAI-compatible)
    if (provider.name === 'groq' || provider.name === 'sambanova') {
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`${provider.name} streaming error: ${response.statusText}`);
      }
      
      return response.body;
    }
    
    // Fallback to non-streaming for Gemini
    const response = await callAI(module, userMessage, context);
    if (response.success && response.response) {
      const encoder = new TextEncoder();
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(response.response!));
          controller.close();
        }
      });
    }
    
    return null;
  } catch (error) {
    console.error(`[AI Gateway] Streaming failed for ${provider.name}:`, error);
    recordFailure(provider);
    return null;
  }
}
