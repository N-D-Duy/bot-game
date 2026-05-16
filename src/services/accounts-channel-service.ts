import { Client, EmbedBuilder, Message, TextChannel } from 'discord.js';

import type { GameApiService } from './game-api-service.js';

const CREATE_CMD = /^\/account\s+create\s+(\S+)\s+(\S+)$/i;
const CHANGE_PASS_CMD = /^\/account\s+change-password\s+(\S+)\s+(\S+)\s+(\S+)$/i;
const AUTO_DELETE_MS = 15_000;

export class AccountsChannelService {
    constructor(
        private readonly client: Client,
        private readonly gameApiService: GameApiService,
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
                '**Gõ lệnh vào kênh này để thực hiện:**\n\n' +
                    '📝 **Đăng ký tài khoản**\n' +
                    '```/account create <tên_đăng_nhập> <mật_khẩu>```\n' +
                    '🔒 **Đổi mật khẩu**\n' +
                    '```/account change-password <tên_đăng_nhập> <mật_khẩu_cũ> <mật_khẩu_mới>```\n\n' +
                    '**Ví dụ:**\n' +
                    '`/account create player123 pass123`\n' +
                    '`/account change-password player123 pass123 newpass456`\n\n' +
                    '> Tin nhắn không đúng định dạng sẽ bị xóa tự động.\n' +
                    '> Kết quả chỉ hiển thị trong vài giây rồi tự xóa.'
            )
            .setColor(0x5865f2)
            .setFooter({
                text: 'Username: 5-20 ký tự a-z0-9  |  Mật khẩu: tối thiểu 5 ký tự a-z0-9',
            });

        await channel.send({ embeds: [embed] });
    }

    async handleMessage(msg: Message): Promise<void> {
        const content = msg.content.trim();
        await msg.delete().catch(() => null);

        let replyText: string | undefined;

        const createMatch = CREATE_CMD.exec(content);
        if (createMatch) {
            const [, username, password] = createMatch;
            const phone = this.generatePhone();
            try {
                const result = await this.gameApiService.register({ username, password, phone });
                replyText = `✅ ${msg.author} — ${result.message}`;
            } catch (err) {
                replyText = `❌ ${msg.author} — ${(err as Error).message}`;
            }
        } else {
            const changeMatch = CHANGE_PASS_CMD.exec(content);
            if (changeMatch) {
                const [, username, old_password, new_password] = changeMatch;
                try {
                    const result = await this.gameApiService.changePassword({
                        username,
                        old_password,
                        new_password,
                    });
                    replyText = `✅ ${msg.author} — ${result.message}`;
                } catch (err) {
                    replyText = `❌ ${msg.author} — ${(err as Error).message}`;
                }
            }
            // Invalid format → just silently delete (already deleted above)
        }

        if (replyText) {
            const sent = await (msg.channel as TextChannel).send(replyText).catch(() => null);
            if (sent) {
                setTimeout(() => sent.delete().catch(() => null), AUTO_DELETE_MS);
            }
        }
    }

    private generatePhone(): string {
        const prefixes = ['03', '05', '07', '08', '09'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
        return `${prefix}${suffix}`;
    }
}
