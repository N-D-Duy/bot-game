import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    PermissionsString,
} from 'discord.js';
import { createRequire } from 'node:module';

import { EventData } from '../../models/internal-models.js';
import { InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';
import type { NotificationService } from '../../services/notification-service.js';
import type { NotificationChannel } from '../../services/notification-service.js';

const require = createRequire(import.meta.url);
let Config = require('../../../config/config.json');

const CHANNEL_CHOICES: { name: string; value: NotificationChannel }[] = [
    { name: '👹 Boss', value: 'boss' },
    { name: '📢 General', value: 'general' },
];

/**
 * /notify command — sends a notification embed to a configured game channel.
 * Restricted to users listed in config.developers or with ManageGuild permission.
 */
export class NotifyCommand implements Command {
    public names = ['notify'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = ['SendMessages', 'EmbedLinks'];

    constructor(private readonly notificationService: NotificationService) {}

    public static get metadata() {
        return {
            name: 'notify',
            description: 'Send a notification to a game channel',
            options: [
                {
                    name: 'channel',
                    description: 'Target notification channel',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: CHANNEL_CHOICES,
                },
                {
                    name: 'title',
                    description: 'Notification title',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'message',
                    description: 'Notification message',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        };
    }

    public async execute(intr: ChatInputCommandInteraction, _data: EventData): Promise<void> {
        const isDeveloper = Config.developers.includes(intr.user.id);
        const hasPermission =
            isDeveloper ||
            (intr.memberPermissions?.has('ManageGuild') ?? false);

        if (!hasPermission) {
            await InteractionUtils.send(intr, 'You do not have permission to use this command.');
            return;
        }

        const target = intr.options.getString('channel', true) as NotificationChannel;
        const title = intr.options.getString('title', true);
        const message = intr.options.getString('message', true);

        try {
            await this.notificationService.send(target, { title, description: message });
            await InteractionUtils.send(intr, `Notification sent to **${target}** channel.`);
        } catch (error) {
            await InteractionUtils.send(
                intr,
                `Failed to send notification: ${(error as Error).message}`
            );
        }
    }
}
