import type { AIMessage, AIResponse, ChatOptions, AIProvider } from './types.js';

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 30_000;

export class OpenRouterProvider implements AIProvider {
    readonly name = 'openrouter';

    constructor(
        private readonly apiKey: string,
        private readonly defaultModel: string = 'meta-llama/llama-3.1-8b-instruct'
    ) {}

    async chat(messages: AIMessage[], options?: ChatOptions): Promise<AIResponse> {
        const model = options?.model ?? this.defaultModel;
        const body = {
            model,
            messages,
            max_tokens: options?.maxTokens,
            temperature: options?.temperature,
        };
        return this.callWithRetry(body);
    }

    private async callWithRetry(body: object, attempt = 0): Promise<AIResponse> {
        let res: Response;
        try {
            res = await fetch(BASE_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
        } catch (err) {
            if (attempt === 0) return this.callWithRetry(body, 1);
            throw err;
        }

        if ((res.status === 429 || res.status >= 500) && attempt === 0) {
            await new Promise(r => setTimeout(r, 1_000));
            return this.callWithRetry(body, 1);
        }

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`OpenRouter ${res.status}: ${text}`);
        }

        const data = (await res.json()) as {
            choices: { message: { content: string } }[];
            usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        };

        return {
            content: data.choices[0].message.content,
            usage: {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
            },
        };
    }
}
