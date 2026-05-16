import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    PermissionsString,
} from 'discord.js';
import { createRequire } from 'node:module';

import { EventData } from '../../models/internal-models.js';
import { InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';
import type { GameApiService } from '../../services/game-api-service.js';

const require = createRequire(import.meta.url);
let Config = require('../../../config/config.json');

/**
 * /account command — account management for the game server.
 * Intended to be used in the designated accounts channel only.
 *
 * Subcommands:
 *   /account create  <username> <password>
 *   /account change-password  <username> <old_password> <new_password>
 */
export class AccountCommand implements Command {
    public names = ['account'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private readonly gameApiService: GameApiService) {}

    public static get metadata() {
        return {
            name: 'account',
            description: 'Game account management',
            options: [
                {
                    name: 'create',
                    description: 'Create a new game account',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'username',
                            description: 'Account username',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: 'password',
                            description: 'Account password',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
                {
                    name: 'change-password',
                    description: 'Change your game account password',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'username',
                            description: 'Account username',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: 'old_password',
                            description: 'Current password',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: 'new_password',
                            description: 'New password',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
            ],
        };
    }

    public async execute(intr: ChatInputCommandInteraction, _data: EventData): Promise<void> {
        // Restrict to the designated accounts channel (if configured)
        const accountsChannelId = Config.channels?.accounts;
        if (accountsChannelId && intr.channelId !== accountsChannelId) {
            await InteractionUtils.send(
                intr,
                `Account commands can only be used in <#${accountsChannelId}>.`
            );
            return;
        }

        const subcommand = intr.options.getSubcommand(true);

        try {
            if (subcommand === 'create') {
                await this.handleCreate(intr);
            } else if (subcommand === 'change-password') {
                await this.handleChangePassword(intr);
            }
        } catch (error) {
            await InteractionUtils.send(
                intr,
                `Error: ${(error as Error).message}`
            );
        }
    }

    private async handleCreate(intr: ChatInputCommandInteraction): Promise<void> {
        const username = intr.options.getString('username', true);
        const password = intr.options.getString('password', true);
        const phone = this.generatePhone();

        const result = await this.gameApiService.register({ username, password, phone });

        await InteractionUtils.send(intr, result.message);
    }

    private async handleChangePassword(intr: ChatInputCommandInteraction): Promise<void> {
        const username = intr.options.getString('username', true);
        const old_password = intr.options.getString('old_password', true);
        const new_password = intr.options.getString('new_password', true);

        const result = await this.gameApiService.changePassword({
            username,
            old_password,
            new_password,
        });

        await InteractionUtils.send(intr, result.message);
    }

    private generatePhone(): string {
        const prefixes = ['03', '05', '07', '08', '09'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
        return `${prefix}${suffix}`;
    }
}
