import type { AIProvider, AIMessage, ChatOptions } from './types.js';
import { OpenRouterProvider } from './openrouter-provider.js';
import { AzureProvider } from './azure-provider.js';

type ModelEntry = { provider: 'openrouter' | 'azure'; model: string };

export interface AIRouterConfig {
    openRouterApiKey?: string;
    azure?: {
        key: string;
        endpoint: string;
        deployment: string;
    };
    aliases?: Record<string, ModelEntry>;
}

const DEFAULT_ALIASES: Record<string, ModelEntry> = {
    fast: { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct' },
    smart: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    azure: { provider: 'azure', model: 'gpt-4o' },
};

export class AIRouter {
    private providers = new Map<string, AIProvider>();
    private readonly aliases: Record<string, ModelEntry>;

    constructor(config: AIRouterConfig = {}) {
        this.aliases = config.aliases ?? DEFAULT_ALIASES;

        if (config.openRouterApiKey) {
            this.providers.set('openrouter', new OpenRouterProvider(config.openRouterApiKey));
        }

        if (config.azure?.key && config.azure.endpoint && config.azure.deployment) {
            this.providers.set(
                'azure',
                new AzureProvider(config.azure.key, config.azure.endpoint, config.azure.deployment)
            );
        }
    }

    get(alias: string): AIProvider {
        const entry = this.aliases[alias];

        if (!entry || !this.providers.has(entry.provider)) {
            for (const preferred of ['openrouter', 'azure'] as const) {
                if (this.providers.has(preferred)) {
                    const provider = this.providers.get(preferred)!;
                    const fallbackModel =
                        preferred === 'azure' ? 'gpt-4o' : 'meta-llama/llama-3.1-8b-instruct';
                    return {
                        name: `${preferred}/${fallbackModel}`,
                        chat: (msgs: AIMessage[], opts?: ChatOptions) =>
                            provider.chat(msgs, { ...opts, model: fallbackModel }),
                    };
                }
            }
            throw new Error(
                `AI provider '${entry?.provider ?? alias}' is not configured`
            );
        }

        const provider = this.providers.get(entry.provider)!;
        return {
            name: `${entry.provider}/${entry.model}`,
            chat: (msgs: AIMessage[], opts?: ChatOptions) =>
                provider.chat(msgs, { ...opts, model: entry.model }),
        };
    }

    isAvailable(alias: string): boolean {
        const entry = this.aliases[alias];
        return !!entry && this.providers.has(entry.provider);
    }
}
