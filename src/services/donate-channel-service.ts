import { Client, EmbedBuilder, TextChannel } from 'discord.js';

import type { GameApiService } from './game-api-service.js';

const BANK_ACCOUNT_NUMBER = '181816092003';
const BANK_ACCOUNT_NAME = 'NGUYEN DUC DUY';

interface DonateSession {
    requesterId: string;
    username: string;
    playerId: number;
    createdAt: number;
}

export interface DonateWebhookPayload {
    username?: string;
    player_id?: number;
    success?: boolean;
    message?: string;
    amount?: number;
    transaction_id?: string;
}

export class DonateChannelService {
    private readonly pendingByPlayerId = new Map<number, DonateSession>();
    private readonly pendingByUsername = new Map<string, DonateSession>();

    constructor(
        private readonly client: Client,
        private readonly gameApiService: GameApiService,
        readonly channelId: string
    ) {}

    async initChannel(): Promise<void> {
        const channel = await this.getTextChannel();
        if (!channel) {
            return;
        }

        const messages = await channel.messages.fetch({ limit: 50 });
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

        const embed = new EmbedBuilder()
            .setTitle('💸 Donate')
            .setColor(0x00a86b)
            .setDescription(
                '**Nạp tiền qua QR (riêng tư):**\n' +
                    'Dùng lệnh sau trong kênh này:\n' +
                    '```/donate username:<tên_nhân_vật>```\n\n' +
                    'Bot sẽ gọi game server để lấy player ID, sau đó trả QR chỉ bạn nhìn thấy.\n\n' +
                    `Ngân hàng: MB Bank\n` +
                    `Số tài khoản: ${BANK_ACCOUNT_NUMBER}\n` +
                    `Chủ tài khoản: ${BANK_ACCOUNT_NAME}`
            )
            .setFooter({
                text: 'Nội dung chuyển khoản sẽ tự động theo định dạng dtllb{player_id}',
            });

        await channel.send({ embeds: [embed] });
    }

    async createQrForUsername(requesterId: string, username: string): Promise<{
        playerId: number;
        qrImageUrl: string;
        qrContent: string;
    }> {
        const normalized = username.trim();
        const playerInfo = await this.gameApiService.getPlayerId({ username: normalized });

        const session: DonateSession = {
            requesterId,
            username: playerInfo.username,
            playerId: playerInfo.player_id,
            createdAt: Date.now(),
        };

        this.pendingByPlayerId.set(session.playerId, session);
        this.pendingByUsername.set(session.username.toLowerCase(), session);

        const qrContent = `dtllb${session.playerId}`;
        const qrImageUrl =
            `https://img.vietqr.io/image/MB-${BANK_ACCOUNT_NUMBER}-qr_only.png` +
            `?&addInfo=${encodeURIComponent(qrContent)}` +
            `&accountName=${encodeURIComponent(BANK_ACCOUNT_NAME)}`;

        return { playerId: session.playerId, qrImageUrl, qrContent };
    }

    async handleWebhook(payload: DonateWebhookPayload): Promise<void> {
        const session = this.findSession(payload);
        if (!session) {
            return;
        }

        const statusText = payload.success === false ? '❌ Thất bại' : '✅ Thành công';
        const amountText =
            typeof payload.amount === 'number'
                ? `\nSố tiền: ${payload.amount.toLocaleString('vi-VN')} VND`
                : '';
        const txText = payload.transaction_id ? `\nMã GD: ${payload.transaction_id}` : '';
        const messageText = payload.message ? `\nNội dung: ${payload.message}` : '';

        const notifyText =
            `Kết quả donate cho ${session.username} (${session.playerId})\n` +
            `${statusText}${amountText}${txText}${messageText}`;

        const user = await this.client.users.fetch(session.requesterId).catch(() => null);
        if (user) {
            await user.send(notifyText).catch(() => null);
        }

        const channel = await this.getTextChannel();
        if (channel) {
            await channel
                .send({
                    content: `<@${session.requesterId}> ${notifyText}`,
                    allowedMentions: { users: [session.requesterId] },
                })
                .catch(() => null);
        }

        this.pendingByPlayerId.delete(session.playerId);
        this.pendingByUsername.delete(session.username.toLowerCase());
    }

    private findSession(payload: DonateWebhookPayload): DonateSession | undefined {
        if (typeof payload.player_id === 'number') {
            return this.pendingByPlayerId.get(payload.player_id);
        }

        if (typeof payload.username === 'string' && payload.username.trim()) {
            return this.pendingByUsername.get(payload.username.toLowerCase());
        }

        return undefined;
    }

    private async getTextChannel(): Promise<TextChannel | undefined> {
        try {
            const fetched = await this.client.channels.fetch(this.channelId);
            if (!fetched?.isTextBased()) {
                return undefined;
            }
            return fetched as TextChannel;
        } catch {
            return undefined;
        }
    }
}
