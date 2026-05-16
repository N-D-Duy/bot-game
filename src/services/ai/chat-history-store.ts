import type { AIMessage } from './types.js';

const MAX_TURNS = 20;

/**
 * In-memory conversation history store.
 * Keyed by Discord channel ID (for channel conversations) or user ID (for DMs).
 * Intentionally clears on restart to limit unbounded token cost.
 */
export class ChatHistoryStore {
    private histories = new Map<string, AIMessage[]>();

    get(key: string): AIMessage[] {
        return this.histories.get(key) ?? [];
    }

    push(key: string, message: AIMessage): void {
        const history = this.histories.get(key) ?? [];
        history.push(message);
        // Drop oldest turns when exceeding MAX_TURNS
        while (history.length > MAX_TURNS) {
            history.shift();
        }
        this.histories.set(key, history);
    }

    clear(key: string): void {
        this.histories.delete(key);
    }
}
