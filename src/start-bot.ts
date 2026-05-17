import { REST } from '@discordjs/rest';
import { Options, Partials } from 'discord.js';
import { createRequire } from 'node:module';
import 'reflect-metadata';

import { NotifyWebhookController, DonateWebhookController, RootController } from './controllers/index.js';
import { Button } from './buttons/index.js';
import {
    AccountCommand,
    DevCommand,
    DonateCommand,
    HelpCommand,
    InfoCommand,
    NotifyCommand,
    TestCommand,
} from './commands/chat/index.js';
import {
    ChatCommandMetadata,
    Command,
    MessageCommandMetadata,
    UserCommandMetadata,
} from './commands/index.js';
import { ViewDateSent } from './commands/message/index.js';
import { ViewDateJoined } from './commands/user/index.js';
import {
    ButtonHandler,
    CommandHandler,
    GuildJoinHandler,
    GuildLeaveHandler,
    MessageHandler,
    ReactionHandler,
    TriggerHandler,
} from './events/index.js';
import { CustomClient } from './extensions/index.js';
import { Job } from './jobs/index.js';
import { Bot } from './models/bot.js';
import { Reaction } from './reactions/index.js';
import {
    AIService,
    AccountsChannelService,
    CommandRegistrationService,
    DonateChannelService,
    EventDataService,
    GameApiService,
    JobService,
    Logger,
    NotificationService,
} from './services/index.js';
import { Trigger } from './triggers/index.js';
import { Api } from './models/api.js';

const require = createRequire(import.meta.url);
let Config = require('../config/config.json');
let Logs = require('../lang/logs.json');

async function start(): Promise<void> {
    // Services
    let eventDataService = new EventDataService();

    // Client
    let client = new CustomClient({
        intents: Config.client.intents,
        partials: (Config.client.partials as string[]).map(partial => Partials[partial]),
        makeCache: Options.cacheWithLimits({
            // Keep default caching behavior
            ...Options.DefaultMakeCacheSettings,
            // Override specific options from config
            ...Config.client.caches,
        }),
        enforceNonce: true,
    });

    // Game services
    let notificationService = new NotificationService(client, {
        boss: Config.channels?.boss ?? '',
        general: Config.channels?.general ?? '',
    });
    let gameApiService = new GameApiService({
        url: Config.gameApi?.url ?? 'http://localhost:8080',
        secret: Config.gameApi?.secret ?? '',
    });
    let aiService = new AIService({ ...Config.ai, modelAlias: Config.ai?.defaultModel });
    let accountsChannelService = Config.channels?.accounts
        ? new AccountsChannelService(client, gameApiService, Config.channels.accounts)
        : undefined;
    let donateChannelService = Config.channels?.donate
        ? new DonateChannelService(client, gameApiService, Config.channels.donate)
        : undefined;

    // Commands
    let commands: Command[] = [
        // Chat Commands
        new DevCommand(),
        new HelpCommand(),
        new InfoCommand(),
        new TestCommand(),
        new NotifyCommand(notificationService),
        new AccountCommand(gameApiService),
        new DonateCommand(donateChannelService),

        // Message Context Commands
        new ViewDateSent(),

        // User Context Commands
        new ViewDateJoined(),

        // TODO: Add new commands here
    ];

    // Buttons
    let buttons: Button[] = [
        // TODO: Add new buttons here
    ];

    // Reactions
    let reactions: Reaction[] = [
        // TODO: Add new reactions here
    ];

    // Triggers
    let triggers: Trigger[] = [
        // TODO: Add new triggers here
    ];

    // Event handlers
    let guildJoinHandler = new GuildJoinHandler(eventDataService);
    let guildLeaveHandler = new GuildLeaveHandler();
    let commandHandler = new CommandHandler(commands, eventDataService);
    let buttonHandler = new ButtonHandler(buttons, eventDataService);
    let triggerHandler = new TriggerHandler(triggers, eventDataService);
    let messageHandler = new MessageHandler(triggerHandler, aiService, Config.channels?.bot, accountsChannelService);
    let reactionHandler = new ReactionHandler(reactions, eventDataService);

    // Jobs
    let jobs: Job[] = [
        // TODO: Add new jobs here
    ];

    // Bot
    let bot = new Bot(
        Config.client.token,
        client,
        guildJoinHandler,
        guildLeaveHandler,
        messageHandler,
        commandHandler,
        buttonHandler,
        reactionHandler,
        new JobService(jobs),
        accountsChannelService,
        donateChannelService
    );

    let notifyWebhookController = new NotifyWebhookController(client, Config.channels ?? {});
    notifyWebhookController.authToken = Config.api.secret;
    let donateWebhookController = new DonateWebhookController(donateChannelService);
    donateWebhookController.authToken = Config.api.secret;
    let rootController = new RootController();
    let api = new Api([rootController, notifyWebhookController, donateWebhookController]);

    // Register
    if (process.argv[2] == 'commands') {
        try {
            let rest = new REST({ version: '10' }).setToken(Config.client.token);
            let commandRegistrationService = new CommandRegistrationService(rest);
            let localCmds = [
                ...Object.values(ChatCommandMetadata).sort((a, b) => (a.name > b.name ? 1 : -1)),
                ...Object.values(MessageCommandMetadata).sort((a, b) => (a.name > b.name ? 1 : -1)),
                ...Object.values(UserCommandMetadata).sort((a, b) => (a.name > b.name ? 1 : -1)),
            ];
            await commandRegistrationService.process(localCmds, process.argv);
        } catch (error) {
            Logger.error(Logs.error.commandAction, error);
        }
        // Wait for any final logs to be written.
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.exit();
    }

    await bot.start();
    await api.start();
}

process.on('unhandledRejection', (reason, _promise) => {
    Logger.error(Logs.error.unhandledRejection, reason);
});

start().catch(error => {
    Logger.error(Logs.error.unspecified, error);
});
