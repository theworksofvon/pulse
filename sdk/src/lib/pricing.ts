/**
 * LLM model pricing utilities
 *
 * Calculates costs for LLM API calls based on token usage.
 * Prices are stored as cents per 1 million tokens for precision.
 *
 * Sources:
 * - OpenAI: https://openai.com/api/pricing/
 * - Anthropic: https://www.anthropic.com/pricing
 */

/**
 * Pricing structure for a model
 */
interface ModelPricing {
  /** Cost in cents per 1 million input tokens */
  inputCentsPer1M: number;
  /** Cost in cents per 1 million output tokens */
  outputCentsPer1M: number;
}

/**
 * Model pricing map
 *
 * All prices in cents per 1 million tokens.
 * Last updated: January 2025
 *
 * OpenAI pricing: https://openai.com/api/pricing/
 * Anthropic pricing: https://www.anthropic.com/pricing
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI models
  // https://openai.com/api/pricing/
  'gpt-4o': {
    inputCentsPer1M: 250,      // $2.50 per 1M input tokens
    outputCentsPer1M: 1000,    // $10.00 per 1M output tokens
  },
  'gpt-4o-mini': {
    inputCentsPer1M: 15,       // $0.15 per 1M input tokens
    outputCentsPer1M: 60,      // $0.60 per 1M output tokens
  },
  'gpt-4-turbo': {
    inputCentsPer1M: 1000,     // $10.00 per 1M input tokens
    outputCentsPer1M: 3000,    // $30.00 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    inputCentsPer1M: 50,       // $0.50 per 1M input tokens
    outputCentsPer1M: 150,     // $1.50 per 1M output tokens
  },

  // Anthropic models
  // https://www.anthropic.com/pricing
  'claude-3-5-sonnet-20241022': {
    inputCentsPer1M: 300,      // $3.00 per 1M input tokens
    outputCentsPer1M: 1500,    // $15.00 per 1M output tokens
  },
  'claude-3-5-sonnet-latest': {
    inputCentsPer1M: 300,      // $3.00 per 1M input tokens
    outputCentsPer1M: 1500,    // $15.00 per 1M output tokens
  },
  'claude-3-5-haiku-20241022': {
    inputCentsPer1M: 80,       // $0.80 per 1M input tokens
    outputCentsPer1M: 400,     // $4.00 per 1M output tokens
  },
  'claude-3-5-haiku-latest': {
    inputCentsPer1M: 80,       // $0.80 per 1M input tokens
    outputCentsPer1M: 400,     // $4.00 per 1M output tokens
  },
  'claude-3-opus-20240229': {
    inputCentsPer1M: 1500,     // $15.00 per 1M input tokens
    outputCentsPer1M: 7500,    // $75.00 per 1M output tokens
  },
  'claude-3-opus-latest': {
    inputCentsPer1M: 1500,     // $15.00 per 1M input tokens
    outputCentsPer1M: 7500,    // $75.00 per 1M output tokens
  },
};

/**
 * Model name aliases for flexible matching
 *
 * Maps common short names or variations to their canonical pricing entries.
 */
const MODEL_ALIASES: Record<string, string> = {
  // OpenAI aliases
  'gpt-4o-2024-11-20': 'gpt-4o',
  'gpt-4o-2024-08-06': 'gpt-4o',
  'gpt-4o-2024-05-13': 'gpt-4o',
  'gpt-4o-mini-2024-07-18': 'gpt-4o-mini',
  'gpt-4-turbo-2024-04-09': 'gpt-4-turbo',
  'gpt-4-turbo-preview': 'gpt-4-turbo',
  'gpt-3.5-turbo-0125': 'gpt-3.5-turbo',
  'gpt-3.5-turbo-1106': 'gpt-3.5-turbo',

  // Anthropic aliases (short names)
  'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku': 'claude-3-5-haiku-20241022',
  'claude-3.5-haiku': 'claude-3-5-haiku-20241022',
  'claude-3-opus': 'claude-3-opus-20240229',
};

/**
 * Gets pricing for a model, handling aliases
 */
function getModelPricing(model: string): ModelPricing | null {
  // Direct lookup first
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }

  // Try alias lookup
  const aliasedModel = MODEL_ALIASES[model];
  if (aliasedModel && MODEL_PRICING[aliasedModel]) {
    return MODEL_PRICING[aliasedModel];
  }

  return null;
}

/**
 * Calculates the cost of an LLM API call in cents
 *
 * @param model - The model name (e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022')
 * @param inputTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output/completion tokens
 * @returns Cost in cents, or null if model pricing is unknown
 *
 * @example
 * ```ts
 * const cost = calculateCost('gpt-4o', 1000, 500);
 * // cost = (1000 * 250 / 1_000_000) + (500 * 1000 / 1_000_000)
 * // cost = 0.25 + 0.5 = 0.75 cents
 * ```
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const pricing = getModelPricing(model);

  if (!pricing) {
    return null;
  }

  const inputCost = (inputTokens * pricing.inputCentsPer1M) / 1_000_000;
  const outputCost = (outputTokens * pricing.outputCentsPer1M) / 1_000_000;

  return inputCost + outputCost;
}

/**
 * Checks if pricing is available for a model
 *
 * @param model - The model name to check
 * @returns true if pricing is available
 */
export function hasPricing(model: string): boolean {
  return getModelPricing(model) !== null;
}
