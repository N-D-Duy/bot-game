import { BaseGuildTextChannel, Client, EmbedBuilder } from 'discord.js';

export type NotificationChannel = 'boss' | 'general';

export interface NotificationPayload {
    title: string;
    description: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
}

/**
 * Sends structured notifications to pre-configured game server channels.
 * Channel IDs are sourced from config/config.json → channels section.
 */
export class NotificationService {
    constructor(
        private readonly client: Client,
        private readonly channelIds: Record<NotificationChannel, string>
    ) {}

    async send(target: NotificationChannel, payload: NotificationPayload): Promise<void> {
        const channelId = this.channelIds[target];
        if (!channelId) {
            throw new Error(`No channel configured for notification type: ${target}`);
        }

        const channel = await this.client.channels.fetch(channelId);
        if (!channel || !(channel instanceof BaseGuildTextChannel)) {
            throw new Error(`Channel ${channelId} not found or is not a text channel`);
        }

        const embed = new EmbedBuilder()
            .setTitle(payload.title)
            .setDescription(payload.description)
            .setColor(payload.color ?? 0x5865f2)
            .setTimestamp();

        if (payload.fields?.length) {
            embed.addFields(payload.fields);
        }

        await channel.send({ embeds: [embed] });
    }
}
