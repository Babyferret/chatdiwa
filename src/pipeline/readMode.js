export function checkTrigger(text, config) {
  if (config.readMode !== "prefix") {
    return { matches: true, text };
  }

  const prefix = config.triggerPrefixes.find((p) => text.startsWith(p));
  if (prefix === undefined) {
    return { matches: false, text };
  }

  return { matches: true, text: text.slice(prefix.length) };
}
