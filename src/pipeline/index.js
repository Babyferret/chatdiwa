import { capLength } from "./lengthCap.js";
import { shouldKeep } from "./filter.js";
import { formatSpeech } from "./format.js";
import { checkTrigger } from "./readMode.js";

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

  const trigger = checkTrigger(capped.text, config);
  if (!trigger.matches) {
    return { user: capped.user, displayText: capped.text, speech: null };
  }

  const speech = formatSpeech({ user: capped.user, text: trigger.text }, config.template);
  return { user: capped.user, displayText: capped.text, speech };
}
