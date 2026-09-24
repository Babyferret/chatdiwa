import { capLength } from "./lengthCap.js";
import { shouldKeep } from "./filter.js";
import { formatSpeech } from "./format.js";

export function processComment(comment, config) {
  const capped = {
    ...comment,
    text: capLength(comment.text, config.maxMessageLength),
  };

  const filterConfig = {
    blockedUsers: config.blockedUsers,
    bannedWords: config.bannedWords,
  };

  if (!shouldKeep(capped, filterConfig)) {
    return null;
  }

  return formatSpeech(capped, config.template);
}
