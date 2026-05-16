import { Message } from 'discord.js';
import { createRequire } from 'node:module';

import { EventHandler, TriggerHandler } from './index.js';
import { AIService } from '../services/ai/ai-service.js';
import type { AccountsChannelService } from '../services/accounts-channel-service.js';

const require = createRequire(import.meta.url);
let Config = require('../../config/config.json');

export class MessageHandler implements EventHandler {
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
                try {
                    const reply = await this.aiService.chat(msg, msg.content);
                    await msg.reply(reply);
                } catch {
                    await msg.reply('Mình gặp lỗi khi xử lý yêu cầu, thử lại sau nhé~');
                }
            } else {
                await msg.reply('Hiện tại mình chưa thể trả lời, bạn thử lại sau nhé~');
            }
            return;
        }

        // Process trigger
        await this.triggerHandler.process(msg);
    }
}
