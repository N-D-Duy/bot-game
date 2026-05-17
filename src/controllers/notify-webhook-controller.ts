import { BaseGuildTextChannel, Client } from 'discord.js';
import { Request, Response, Router } from 'express';

import { Controller } from './index.js';

export interface NotifyWebhookPayload {
    /** Tên kênh đích, khớp với key trong config.channels (vd: "boss", "general") */
    channel: string;
    /** Danh sách embed theo chuẩn Discord (title, description, color, timestamp, footer?) */
    embeds: {
        title?: string;
        description?: string;
        color?: number;
        timestamp?: string;
        footer?: { text: string };
    }[];
}

export class NotifyWebhookController implements Controller {
    public path = '/webhooks/notify';
    public router: Router = Router();
    public authToken?: string;

    constructor(
        private readonly client: Client,
        private readonly channelIds: Record<string, string>
    ) {}

    public register(): void {
        this.router.post('/', (req, res) => this.onWebhook(req, res));
    }

    private async onWebhook(req: Request, res: Response): Promise<void> {
        const payload = req.body as NotifyWebhookPayload;

        if (!payload.channel) {
            res.status(400).json({ success: false, message: 'Missing field: channel' });
            return;
        }
        if (!payload.embeds?.length) {
            res.status(400).json({ success: false, message: 'Missing field: embeds' });
            return;
        }

        const channelId = this.channelIds[payload.channel];
        if (!channelId) {
            res.status(400).json({
                success: false,
                message: `Unknown channel: "${payload.channel}". Valid: ${Object.keys(this.channelIds).join(', ')}`,
            });
            return;
        }

        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || !(channel instanceof BaseGuildTextChannel)) {
                res.status(503).json({ success: false, message: `Channel ${channelId} not found` });
                return;
            }
            await channel.send({ embeds: payload.embeds as any });
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: (err as Error).message });
        }
    }
}
