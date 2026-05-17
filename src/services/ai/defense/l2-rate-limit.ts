import type { CooldownStore } from '../store/cooldown-store.js';
import type { DiscordAIEvent, PipelineResult } from './types.js';

export interface L2RateLimitConfig {
    windowSec: number;
    userPerWindow: number;
    channelPerWindow: number;
}

export class L2RateLimit {
    private readonly windowMs: number;

    constructor(
        private readonly cooldownStore: CooldownStore,
        private readonly config: L2RateLimitConfig
    ) {
        this.windowMs = Math.max(1, config.windowSec) * 1000;
    }

    check(event: DiscordAIEvent): PipelineResult | null {
        const now = Date.now();

        const userLimit = Math.max(1, this.config.userPerWindow);
        const channelLimit = Math.max(1, this.config.channelPerWindow);

        if (this.isLimited(`user:${event.userId}`, userLimit, now)) {
            const remaining = this.windowRemainingSec(`user:${event.userId}`, now);
            return {
                pass: false,
                reason: 'rate_limit',
                replyText: `⏳ Bạn gửi nhanh quá, thử lại sau ${remaining}s`,
            };
        }

        if (this.isLimited(`channel:${event.channelId}`, channelLimit, now)) {
            const remaining = this.windowRemainingSec(`channel:${event.channelId}`, now);
            return {
                pass: false,
                reason: 'rate_limit',
                replyText: `⏳ Kênh đang bận, thử lại sau ${remaining}s`,
            };
        }

        return null;
    }

    private isLimited(key: string, limit: number, now: number): boolean {
        const counter = this.cooldownStore.getRateCounter(key);
        if (!counter || now - counter.windowStart >= this.windowMs) {
            this.cooldownStore.setRateCounter(key, { count: 1, windowStart: now });
            return false;
        }

        if (counter.count >= limit) {
            return true;
        }

        this.cooldownStore.setRateCounter(key, {
            count: counter.count + 1,
            windowStart: counter.windowStart,
        });
        return false;
    }

    private windowRemainingSec(key: string, now: number): number {
        const counter = this.cooldownStore.getRateCounter(key);
        if (!counter) {
            return 0;
        }

        return Math.ceil((this.windowMs - (now - counter.windowStart)) / 1000);
    }
}
