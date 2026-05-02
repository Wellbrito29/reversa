// Reverse dependencies — files that import `file` (1 level in).

export function reverseDeps(graph, file) {
  return graph.edges
    .filter((e) => e.to === file && e.kind === 'imports')
    .map((e) => e.from);
}
