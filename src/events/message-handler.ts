import { Message } from 'discord.js';
import { createRequire } from 'node:module';

import { EventHandler, TriggerHandler } from './index.js';
import { AIService } from '../services/ai/ai-service.js';
import type { AccountsChannelService } from '../services/accounts-channel-service.js';
import { L2RateLimit } from '../services/ai/defense/l2-rate-limit.js';
import { CooldownStore } from '../services/ai/store/cooldown-store.js';
import { UserQueueStore } from '../services/ai/store/user-queue-store.js';

const require = createRequire(import.meta.url);
let Config = require('../../config/config.json');

export class MessageHandler implements EventHandler {
    private readonly cooldownStore = new CooldownStore();
    private readonly userQueueStore = new UserQueueStore();
    private readonly aiRateLimit = new L2RateLimit(this.cooldownStore, {
        windowSec: Number(Config.ai?.rateLimit?.windowSec ?? 60),
        userPerWindow: Number(Config.ai?.rateLimit?.userPerWindow ?? 6),
        channelPerWindow: Number(Config.ai?.rateLimit?.channelPerWindow ?? 30),
    });

    constructor(
        private triggerHandler: TriggerHandler,
        private aiService?: AIService,
        private botChannelId?: string,
        private accountsChannelService?: AccountsChannelService
    ) {}

    public async process(msg: Message): Promise<void> {
        // Don't respond to system messages or self
        if (msg.system || msg.author.id === msg.client.user?.id) {
            return;
        }

        // Handle accounts channel: parse commands, delete invalid messages
        if (this.accountsChannelService && msg.channelId === this.accountsChannelService.channelId) {
            await this.accountsChannelService.handleMessage(msg);
            return;
        }

        // Keep donate channel read-only for slash-command flow only
        if (Config.channels?.donate && msg.channelId === Config.channels.donate) {
            await msg.delete().catch(() => null);
            return;
        }

        // Respond in the dedicated bot channel
        if (this.botChannelId && msg.channelId === this.botChannelId && msg.content.trim()) {
            if (this.aiService?.isAvailable()) {
                const rateResult = this.aiRateLimit.check({
                    userId: msg.author.id,
                    channelId: msg.channelId,
                });
                if (rateResult && !rateResult.pass) {
                    const replyText = 'replyText' in rateResult ? rateResult.replyText : undefined;
                    if (replyText) {
                        await msg.reply(replyText).catch(() => null);
                    }
                    return;
                }

                const maxQueuePerUser = Math.max(1, Number(Config.ai?.rateLimit?.maxQueuePerUser ?? 3));
                if (this.userQueueStore.size(msg.author.id) >= maxQueuePerUser) {
                    await msg
                        .reply('⏳ Hàng chờ của bạn đang đầy, đợi bot xử lý xong rồi gửi tiếp nhé.')
                        .catch(() => null);
                    return;
                }

                this.userQueueStore.enqueue(msg.author.id, async () => {
                    try {
                        const reply = await this.aiService.chat(msg, msg.content);
                        await msg.reply(reply);
                    } catch {
                        await msg.reply('Mình gặp lỗi khi xử lý yêu cầu, thử lại sau nhé~').catch(() => null);
                    }
                });
            } else {
                await msg.reply('Hiện tại mình chưa thể trả lời, bạn thử lại sau nhé~');
            }
            return;
        }

        // Process trigger
        await this.triggerHandler.process(msg);
    }
}
