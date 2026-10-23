export function levenshtein(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

/** Closest candidate within a small edit distance, for "¿quisiste decir…?" hints. */
export function closest(word: string, candidates: readonly string[]) {
  let best: string | undefined
  let bestDist = Math.max(2, Math.floor(word.length / 3)) + 1
  for (const c of candidates) {
    const d = levenshtein(word, c)
    if (d < bestDist) {
      best = c
      bestDist = d
    }
  }
  return best
}
