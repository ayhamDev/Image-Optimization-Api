export async function CleanPromise<T, E>(
  promise: Promise<T>
): Promise<[T | null, E | null]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (err) {
    return [null, err as E];
  }
}
