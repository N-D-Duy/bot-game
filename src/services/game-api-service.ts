const TIMEOUT_MS = 10_000;

export interface RegisterRequest {
    username: string;
    password: string;
    phone: string;
}

export interface ChangePasswordRequest {
    username: string;
    old_password: string;
    new_password: string;
}

export interface GameApiResponse {
    success: boolean;
    message: string;
}

export interface PlayerIdResponse {
    success: boolean;
    player_id: number;
    username: string;
}

/**
 * HTTP client for the game server REST API.
 * Base URL and secret token come from config/config.json → gameApi section.
 */
export class GameApiService {
    private readonly baseUrl: string;
    private readonly secret: string;

    constructor(config: { url: string; secret: string }) {
        this.baseUrl = config.url.replace(/\/$/, '');
        this.secret = config.secret;
    }

    async register(payload: RegisterRequest): Promise<GameApiResponse> {
        return this.post('/api/register', payload);
    }

    async changePassword(payload: ChangePasswordRequest): Promise<GameApiResponse> {
        return this.post('/api/change-password', payload);
    }

    async getPlayerId(payload: { username: string }): Promise<PlayerIdResponse> {
        try {
            return await this.post('/api/player-id', payload);
        } catch {
            return await this.get(`/api/player-id?username=${encodeURIComponent(payload.username)}`);
        }
    }

    private async post<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
        let res: Response;
        try {
            res = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Secret': this.secret,
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
        } catch (err) {
            throw new Error(`Game API request failed: ${(err as Error).message}`);
        }

        const text = await res.text();
        let data: TResponse;
        try {
            data = JSON.parse(text) as TResponse;
        } catch {
            console.error(`[GameAPI] Non-JSON response ${res.status} from ${path}: ${text.slice(0, 300)}`);
            throw new Error(`Lỗi kết nối server game (${res.status})`);
        }

        if (!res.ok) {
            const message = this.getErrorMessage(data);
            console.error(`[GameAPI] Error ${res.status} from ${path}: ${message}`);
            throw new Error(message);
        }

        return data;
    }

    private async get<TResponse>(path: string): Promise<TResponse> {
        let res: Response;
        try {
            res = await fetch(`${this.baseUrl}${path}`, {
                method: 'GET',
                headers: {
                    'X-API-Secret': this.secret,
                },
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
        } catch (err) {
            throw new Error(`Game API request failed: ${(err as Error).message}`);
        }

        const text = await res.text();
        let data: TResponse;
        try {
            data = JSON.parse(text) as TResponse;
        } catch {
            console.error(`[GameAPI] Non-JSON response ${res.status} from ${path}: ${text.slice(0, 300)}`);
            throw new Error(`Lỗi kết nối server game (${res.status})`);
        }

        if (!res.ok) {
            const message = this.getErrorMessage(data);
            console.error(`[GameAPI] Error ${res.status} from ${path}: ${message}`);
            throw new Error(message);
        }

        return data;
    }

    private getErrorMessage(data: unknown): string {
        if (typeof data === 'object' && data && 'message' in data) {
            const message = (data as { message?: unknown }).message;
            if (typeof message === 'string' && message.trim()) {
                return message;
            }
        }

        return 'Game API error';
    }
}
