// Impact — transitive reverse-dep BFS. Answers: if I change X, what
// downstream files might break?

export function impact(graph, file) {
  const reverse = new Map();
  for (const e of graph.edges) {
    if (e.kind !== 'imports') continue;
    if (!reverse.has(e.to)) reverse.set(e.to, []);
    reverse.get(e.to).push(e.from);
  }
  const visited = new Set();
  const queue = [file];
  while (queue.length) {
    const node = queue.shift();
    const importers = reverse.get(node) ?? [];
    for (const imp of importers) {
      if (visited.has(imp)) continue;
      visited.add(imp);
      queue.push(imp);
    }
  }
  return Array.from(visited);
}
