export function safeReturnTo(value: string | null | undefined) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/account';
}
