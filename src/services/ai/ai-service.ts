import type { Message } from 'discord.js';
import { AIRouter } from './ai-router.js';
import type { AIRouterConfig } from './ai-router.js';
import { ChatHistoryStore } from './chat-history-store.js';
import type { AIMessage } from './types.js';

export interface AIServiceOptions {
    /** Alias of the model to use (fast | smart | azure). Defaults to 'fast'. */
    modelAlias?: string;
    /** System prompt to inject at the start of every conversation. */
    systemPrompt?: string;
    /** Max tokens for the AI response. */
    maxTokens?: number;
    /** Temperature (0-2). */
    temperature?: number;
    /** OpenRouter API key (from config.json ai.openRouterApiKey). */
    openRouterApiKey?: string;
    /** Azure OpenAI credentials (from config.json ai.azure). */
    azure?: AIRouterConfig['azure'];
}

/**
 * High-level AI service for Discord.
 * Wraps AIRouter + ChatHistoryStore and handles conversation keying.
 */
export class AIService {
    private readonly router: AIRouter;
    private readonly history: ChatHistoryStore;

    constructor(
        private readonly options: AIServiceOptions = {}
    ) {
        this.router = new AIRouter({
            openRouterApiKey: options.openRouterApiKey,
            azure: options.azure,
        });
        this.history = new ChatHistoryStore();
    }

    /**
     * Send a message to AI and get a reply.
     * Conversation history is keyed by channel ID (or user ID for DMs).
     */
    async chat(message: Message, userText: string): Promise<string> {
        const alias = this.options.modelAlias ?? 'fast';
        const provider = this.router.get(alias);

        // Key by channel in guilds, by user in DMs
        const key = message.guildId ? message.channelId : message.author.id;

        const messages: AIMessage[] = [];

        if (this.options.systemPrompt) {
            messages.push({ role: 'system', content: this.options.systemPrompt });
        }

        // Append stored history
        messages.push(...this.history.get(key));

        // Append current user message
        const userMsg: AIMessage = { role: 'user', content: userText };
        messages.push(userMsg);

        const response = await provider.chat(messages, {
            maxTokens: this.options.maxTokens,
            temperature: this.options.temperature,
        });

        // Persist turns
        this.history.push(key, userMsg);
        this.history.push(key, { role: 'assistant', content: response.content });

        return response.content;
    }

    /** Clear conversation history for a channel or user. */
    clearHistory(key: string): void {
        this.history.clear(key);
    }

    /** Check whether AI providers are available. */
    isAvailable(): boolean {
        return this.router.isAvailable(this.options.modelAlias ?? 'azure');
    }
}
