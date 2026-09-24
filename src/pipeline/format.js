export function formatSpeech(comment, mode) {
  if (mode === "message-only") {
    return comment.text;
  }
  return `${comment.user} พูดว่า ${comment.text}`;
}
