import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    PermissionFlagsBits,
    PermissionsBitField,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

import { Args } from './index.js';
import { Language } from '../models/enum-helpers/index.js';
import { Lang } from '../services/index.js';

export const ChatCommandMetadata: {
    [command: string]: RESTPostAPIChatInputApplicationCommandsJSONBody;
} = {
    DEV: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.dev', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.dev'),
        description: Lang.getRef('commandDescs.dev', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.dev'),
        dm_permission: true,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.Administrator,
        ]).toString(),
        options: [
            {
                ...Args.DEV_COMMAND,
                required: true,
            },
        ],
    },
    HELP: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.help', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.help'),
        description: Lang.getRef('commandDescs.help', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.help'),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                ...Args.HELP_OPTION,
                required: true,
            },
        ],
    },
    INFO: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.info', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.info'),
        description: Lang.getRef('commandDescs.info', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.info'),
        dm_permission: true,
        default_member_permissions: undefined,
        options: [
            {
                ...Args.INFO_OPTION,
                required: true,
            },
        ],
    },
    TEST: {
        type: ApplicationCommandType.ChatInput,
        name: Lang.getRef('chatCommands.test', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('chatCommands.test'),
        description: Lang.getRef('commandDescs.test', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('commandDescs.test'),
        dm_permission: true,
        default_member_permissions: undefined,
    },
    NOTIFY: {
        type: ApplicationCommandType.ChatInput,
        name: 'notify',
        description: 'Send a notification to a game channel',
        dm_permission: false,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.ManageGuild,
        ]).toString(),
        options: [
            {
                name: 'channel',
                description: 'Target notification channel',
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    { name: '👹 Boss', value: 'boss' },
                    { name: '📢 General', value: 'general' },
                ],
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
    },
    ACCOUNT: {
        type: ApplicationCommandType.ChatInput,
        name: 'account',
        description: 'Game account management',
        dm_permission: false,
        default_member_permissions: undefined,
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
    },
    DONATE: {
        type: ApplicationCommandType.ChatInput,
        name: 'donate',
        description: 'Generate private donate QR by username',
        dm_permission: false,
        default_member_permissions: undefined,
        options: [
            {
                name: 'username',
                description: 'Game username',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
};

export const MessageCommandMetadata: {
    [command: string]: RESTPostAPIContextMenuApplicationCommandsJSONBody;
} = {
    VIEW_DATE_SENT: {
        type: ApplicationCommandType.Message,
        name: Lang.getRef('messageCommands.viewDateSent', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('messageCommands.viewDateSent'),
        default_member_permissions: undefined,
        dm_permission: true,
    },
};

export const UserCommandMetadata: {
    [command: string]: RESTPostAPIContextMenuApplicationCommandsJSONBody;
} = {
    VIEW_DATE_JOINED: {
        type: ApplicationCommandType.User,
        name: Lang.getRef('userCommands.viewDateJoined', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('userCommands.viewDateJoined'),
        default_member_permissions: undefined,
        dm_permission: true,
    },
};
