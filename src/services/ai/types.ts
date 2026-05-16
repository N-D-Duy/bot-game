export type AIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

export type AIResponse = {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
};

export type ChatOptions = {
    maxTokens?: number;
    temperature?: number;
    model?: string;
};

export interface AIProvider {
    readonly name: string;
    chat(messages: AIMessage[], options?: ChatOptions): Promise<AIResponse>;
}
