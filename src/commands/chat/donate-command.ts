import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionsString,
} from 'discord.js';
import { createRequire } from 'node:module';

import { EventData } from '../../models/internal-models.js';
import { InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';
import type { DonateChannelService } from '../../services/donate-channel-service.js';

const require = createRequire(import.meta.url);
let Config = require('../../../config/config.json');

export class DonateCommand implements Command {
    public names = ['donate'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = ['SendMessages', 'EmbedLinks'];

    constructor(private readonly donateChannelService?: DonateChannelService) {}

    public static get metadata() {
        return {
            name: 'donate',
            description: 'Generate private donate QR by username',
            options: [
                {
                    name: 'username',
                    description: 'Game username',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        };
    }

    public async execute(intr: ChatInputCommandInteraction, _data: EventData): Promise<void> {
        const donateChannelId = Config.channels?.donate;
        if (donateChannelId && intr.channelId !== donateChannelId) {
            await InteractionUtils.send(
                intr,
                `Donate command can only be used in <#${donateChannelId}>.`,
                true
            );
            return;
        }

        if (!this.donateChannelService) {
            await InteractionUtils.send(intr, 'Donate service is not configured.', true);
            return;
        }

        const username = intr.options.getString('username', true);

        try {
            const result = await this.donateChannelService.createQrForUsername(intr.user.id, username);
            const embed = new EmbedBuilder()
                .setTitle('QR Donate')
                .setColor(0x00a86b)
                .setDescription(
                    `Username: **${username}**\n` +
                        `Player ID: **${result.playerId}**\n` +
                        `Nội dung CK: **${result.qrContent}**`
                )
                .setImage(result.qrImageUrl)
                .setFooter({ text: 'Chỉ bạn thấy tin nhắn này.' });

            await InteractionUtils.send(
                intr,
                {
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral,
                },
                true
            );
        } catch (error) {
            await InteractionUtils.send(
                intr,
                `Không lấy được player ID: ${(error as Error).message}`,
                true
            );
        }
    }
}
