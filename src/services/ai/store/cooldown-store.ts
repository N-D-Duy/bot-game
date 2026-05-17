/** In-memory only, acceptable to lose on restart */
export class CooldownStore {
    private rateCounters = new Map<string, { count: number; windowStart: number }>();

    getRateCounter(key: string): { count: number; windowStart: number } | undefined {
        return this.rateCounters.get(key);
    }

    setRateCounter(key: string, value: { count: number; windowStart: number }): void {
        this.rateCounters.set(key, value);
    }
}
