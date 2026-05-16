import type { AIMessage, AIResponse, ChatOptions, AIProvider } from './types.js';

// Use preview version required by newer models (o-series, gpt-5-mini, etc.)
const API_VERSION = '2024-12-01-preview';
const TIMEOUT_MS = 30_000;

export class AzureProvider implements AIProvider {
    readonly name = 'azure';
    private readonly baseUrl: string;

    constructor(
        private readonly apiKey: string,
        endpoint: string, // e.g. https://my-resource.openai.azure.com
        private readonly deployment: string
    ) {
        const clean = endpoint.replace(/\/$/, '');
        this.baseUrl = `${clean}/openai/deployments/${deployment}/chat/completions?api-version=${API_VERSION}`;
    }

    async chat(messages: AIMessage[], options?: ChatOptions): Promise<AIResponse> {
        const body: Record<string, unknown> = {
            messages,
            temperature: options?.temperature,
        };
        // o-series models require max_completion_tokens, not max_tokens
        if (options?.maxTokens !== undefined) {
            body['max_completion_tokens'] = options.maxTokens;
        }
        return this.callWithRetry(body);
    }

    private async callWithRetry(body: object, attempt = 0): Promise<AIResponse> {
        let res: Response;
        try {
            res = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'api-key': this.apiKey, // Azure uses api-key, NOT Authorization: Bearer
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
            throw new Error(`Azure OpenAI ${res.status}: ${text}`);
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
