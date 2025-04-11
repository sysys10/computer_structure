function preprocess(src: string) {
  const lines = src.split(/\n/)
  for (let i = 0, n = lines.length; i < n; i++) {
    lines[i] = lines[i].replace(/#.*$/, '').trim()
  }
  return lines
}
export { preprocess }
