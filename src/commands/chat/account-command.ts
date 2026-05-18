import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ModalBuilder,
    PermissionsString,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { createRequire } from 'node:module';

import { EventData } from '../../models/internal-models.js';
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
    public deferType = CommandDeferType.NONE;
    public requireClientPerms: PermissionsString[] = [];

    constructor(private readonly gameApiService: GameApiService) {}

    public static get metadata() {
        return {
            name: 'account',
            description: 'Game account management',
            options: [
                {
                    name: 'create',
                    description: 'Tạo tài khoản game mới',
                    type: ApplicationCommandOptionType.Subcommand,
                },
                {
                    name: 'change-password',
                    description: 'Đổi mật khẩu tài khoản game',
                    type: ApplicationCommandOptionType.Subcommand,
                },
            ],
        };
    }

    public async execute(intr: ChatInputCommandInteraction, _data: EventData): Promise<void> {
        const accountsChannelId = Config.channels?.accounts;
        if (accountsChannelId && intr.channelId !== accountsChannelId) {
            await intr.reply({
                content: `Account commands can only be used in <#${accountsChannelId}>.`,
                ephemeral: true,
            });
            return;
        }

        const subcommand = intr.options.getSubcommand(true);

        if (subcommand === 'create') {
            await this.showCreateModal(intr);
        } else if (subcommand === 'change-password') {
            await this.showChangePasswordModal(intr);
        }
    }

    private async showCreateModal(intr: ChatInputCommandInteraction): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId('account_create')
            .setTitle('Tạo tài khoản game')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('username')
                        .setLabel('Tên đăng nhập')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(5)
                        .setMaxLength(20)
                        .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('password')
                        .setLabel('Mật khẩu')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(5)
                        .setMaxLength(30)
                        .setRequired(true)
                )
            );

        await intr.showModal(modal);

        try {
            const submitted = await intr.awaitModalSubmit({
                time: 120_000,
                filter: i => i.customId === 'account_create' && i.user.id === intr.user.id,
            });
            const username = submitted.fields.getTextInputValue('username').trim();
            const password = submitted.fields.getTextInputValue('password').trim();
            const phone = this.generatePhone();

            try {
                const result = await this.gameApiService.register({ username, password, phone });
                await submitted.reply({ content: `✅ ${result.message}`, ephemeral: true });
            } catch (err) {
                await submitted.reply({ content: `❌ ${(err as Error).message}`, ephemeral: true });
            }
        } catch {
            // Modal timed out — user closed it without submitting
        }
    }

    private async showChangePasswordModal(intr: ChatInputCommandInteraction): Promise<void> {
        const modal = new ModalBuilder()
            .setCustomId('account_change_password')
            .setTitle('Đổi mật khẩu game')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('username')
                        .setLabel('Tên đăng nhập')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(5)
                        .setMaxLength(20)
                        .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('old_password')
                        .setLabel('Mật khẩu hiện tại')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(5)
                        .setMaxLength(30)
                        .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('new_password')
                        .setLabel('Mật khẩu mới')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(5)
                        .setMaxLength(30)
                        .setRequired(true)
                )
            );

        await intr.showModal(modal);

        try {
            const submitted = await intr.awaitModalSubmit({
                time: 120_000,
                filter: i =>
                    i.customId === 'account_change_password' && i.user.id === intr.user.id,
            });
            const username = submitted.fields.getTextInputValue('username').trim();
            const old_password = submitted.fields.getTextInputValue('old_password').trim();
            const new_password = submitted.fields.getTextInputValue('new_password').trim();

            try {
                const result = await this.gameApiService.changePassword({
                    username,
                    old_password,
                    new_password,
                });
                await submitted.reply({ content: `✅ ${result.message}`, ephemeral: true });
            } catch (err) {
                await submitted.reply({ content: `❌ ${(err as Error).message}`, ephemeral: true });
            }
        } catch {
            // Modal timed out — user closed it without submitting
        }
    }

    private generatePhone(): string {
        const prefixes = ['03', '05', '07', '08', '09'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
        return `${prefix}${suffix}`;
    }
}
