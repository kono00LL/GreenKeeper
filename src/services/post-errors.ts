export function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}
export function postErrorMessage(error: unknown) {
  switch (statusOf(error)) {
    case 401:
      return '登录已失效，请重新登录';
    case 404:
      return '帖子不存在或已删除';
    case 429:
      return '操作太频繁，请稍后重试';
    default:
      return '加载失败，请检查网络后重试';
  }
}
