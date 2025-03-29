export interface StreamRequest {
    userId: string;
    amount: number;
    currency: string;
}

export interface StreamResponse {
    success: boolean;
    message: string;
    streamId?: string;
}