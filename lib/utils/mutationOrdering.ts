// Parent: REQ-0027

const generations = new Map<string, number>();

export function beginMutation(entityKey: string): number {
  const generation = (generations.get(entityKey) ?? 0) + 1;
  generations.set(entityKey, generation);
  return generation;
}

export function isLatestMutation(entityKey: string, generation: number): boolean {
  return generations.get(entityKey) === generation;
}
