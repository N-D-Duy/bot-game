import { Request, Response, Router } from 'express';

import { Controller } from './index.js';
import type {
    DonateChannelService,
    DonateWebhookPayload,
} from '../services/donate-channel-service.js';

export class DonateWebhookController implements Controller {
    public path = '/webhooks/donate';
    public router: Router = Router();
    public authToken?: string;

    constructor(private readonly donateChannelService?: DonateChannelService) {}

    public register(): void {
        this.router.post('/', (req, res) => this.onWebhook(req, res));
    }

    private async onWebhook(req: Request, res: Response): Promise<void> {
        if (!this.donateChannelService) {
            res.status(503).json({ success: false, message: 'Donate channel is not configured' });
            return;
        }

        await this.donateChannelService.handleWebhook(req.body as DonateWebhookPayload);
        res.status(200).json({ success: true });
    }
}
