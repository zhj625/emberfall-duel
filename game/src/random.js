// Seeded randomness for Emberfall Duel.
//
// A tiny mulberry32 generator: good enough for shuffling a deck, and the
// same seed always deals the same game, which is what the screenshot
// scenes rely on. Live play seeds it from the clock instead.

/** Make a generator function that returns floats in [0, 1). */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [0, limit) drawn from the generator. */
export function nextInt(rng, limit) {
  return Math.floor(rng() * limit);
}

/** Shuffle a copy of the list with the generator; the input is untouched. */
export function shuffled(rng, list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = nextInt(rng, i + 1);
    const held = copy[i];
    copy[i] = copy[j];
    copy[j] = held;
  }
  return copy;
}

/** Pick one element of the list with the generator. */
export function pick(rng, list) {
  return list[nextInt(rng, list.length)];
}
