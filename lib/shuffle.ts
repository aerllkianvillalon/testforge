/**
 * Fisher–Yates. Returns a new array and never touches the input. `random` is
 * injectable so order-dependent behaviour can be tested deterministically.
 */
export function shuffled<T>(list: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** [0, 1, …, n-1]: the "unshuffled" order for a list of length n. */
export function indices(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}
