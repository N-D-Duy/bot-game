import { Client, EmbedBuilder, Message, TextChannel } from 'discord.js';

import type { GameApiService } from './game-api-service.js';

export class AccountsChannelService {
    constructor(
        private readonly client: Client,
        private readonly _gameApiService: GameApiService,
        readonly channelId: string
    ) {}

    async initChannel(): Promise<void> {
        let channel: TextChannel;
        try {
            const ch = await this.client.channels.fetch(this.channelId);
            if (!ch?.isTextBased()) return;
            channel = ch as TextChannel;
        } catch {
            return;
        }

        const messages = await channel.messages.fetch({ limit: 50 });

        // Keep the existing help embed if it's already there
        const existing = messages.find(
            m => m.author.id === this.client.user?.id && m.embeds.length > 0
        );

        if (existing) {
            const toDelete = messages.filter(m => m.id !== existing.id);
            if (toDelete.size > 0) {
                await channel.bulkDelete(toDelete, true).catch(() => null);
            }
            return;
        }

        if (messages.size > 0) {
            await channel.bulkDelete(messages, true).catch(() => null);
        }
        await this.sendHelpMessage(channel);
    }

    private async sendHelpMessage(channel: TextChannel): Promise<void> {
        const embed = new EmbedBuilder()
            .setTitle('📋 Quản lý tài khoản game')
            .setDescription(
                '📝 **Đăng ký tài khoản mới**\n' +
                    'Dùng lệnh: `/account create`\n\n' +
                    '🔒 **Đổi mật khẩu**\n' +
                    'Dùng lệnh: `/account change-password`\n\n' +
                    '> Bot sẽ mở cửa sổ nhập thông tin riêng tư — chỉ bạn nhìn thấy.'
            )
            .setColor(0x5865f2)
            .setFooter({
                text: 'Username: 5-20 ký tự  |  Mật khẩu: tối thiểu 5 ký tự',
            });

        await channel.send({ embeds: [embed] });
    }

    async handleMessage(msg: Message): Promise<void> {
        // Delete all user messages — interactions go through slash commands with modal
        await msg.delete().catch(() => null);
    }
}
