export class UserQueueStore {
    private readonly queues = new Map<string, Promise<void>>();
    private readonly sizes = new Map<string, number>();

    size(userId: string): number {
        return this.sizes.get(userId) ?? 0;
    }

    enqueue(userId: string, task: () => Promise<void>): void {
        const prev = this.queues.get(userId) ?? Promise.resolve();
        this.sizes.set(userId, this.size(userId) + 1);

        const next = prev
            .catch(() => null)
            .then(task)
            .finally(() => {
                const remaining = this.size(userId) - 1;
                if (remaining <= 0) {
                    this.sizes.delete(userId);
                    this.queues.delete(userId);
                } else {
                    this.sizes.set(userId, remaining);
                }
            });

        this.queues.set(userId, next);
    }
}
