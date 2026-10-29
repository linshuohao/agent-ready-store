import type { Result } from '@store/contracts';
export async function publicApi<T>(path: string): Promise<Result<T>> {
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3002'}/api/v1${path}`,
      { cache: 'no-store' },
    );
    return (await response.json()) as Result<T>;
  } catch {
    return {
      ok: false,
      error: {
        code: 'TEMPORARY_UNAVAILABLE',
        message: '暫時無法載入資料',
        retryable: true,
      },
      requestId: '',
    };
  }
}
