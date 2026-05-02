// Direct dependencies — files that `file` imports (1 level out).

export function deps(graph, file) {
  return graph.edges
    .filter((e) => e.from === file && e.kind === 'imports')
    .map((e) => e.to);
}
