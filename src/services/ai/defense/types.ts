export type DiscordAIEvent = {
    userId: string;
    channelId: string;
};

export type PipelineResult =
    | { pass: true }
    | { pass: false; reason: 'rate_limit' | 'queue_full'; replyText?: string };
