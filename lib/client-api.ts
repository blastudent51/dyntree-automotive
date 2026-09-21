export type ApiResult = {
  error?: string;
  message?: string;
  code: string;
  url: string;
  records: Record<string, unknown>[];
  nextOffset?: number | null;
  ok?: boolean;
};
export async function apiResult(response: Response): Promise<ApiResult> {
  return (await response.json()) as ApiResult;
}
