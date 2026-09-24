export function shouldKeep(comment, config) {
  const blockedUsers = config.blockedUsers.map((u) => u.toLowerCase());
  if (blockedUsers.includes(comment.user.toLowerCase())) {
    return false;
  }

  const lowerText = comment.text.toLowerCase();
  const hasBannedWord = config.bannedWords.some((word) =>
    lowerText.includes(word.toLowerCase()),
  );
  if (hasBannedWord) {
    return false;
  }

  return true;
}
