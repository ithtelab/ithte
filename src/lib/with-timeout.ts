/** 给任意 Promise 加超时,超时抛错;用于包裹上游网络请求。 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'request'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} 超时(${ms}ms)`)), ms);
    }),
  ]);
}
