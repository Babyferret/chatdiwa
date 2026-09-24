# No first-run wizard; the app always starts with no Room connected

Once the Control Panel could switch Rooms live (username field + Connect/Disconnect), keeping a terminal wizard that also asked for a username created two places that could disagree about which Room to join. We removed the wizard: `chatdiwa` always starts disconnected, auto-reconnecting only if a username was already saved from a previous session, and every other setting (voice, Read Mode, filters) is Control-Panel-only from first launch.

**Considered**: keeping the wizard for the very first run only, since a brand-new user has no saved username yet. Rejected — it would mean two different onboarding paths (wizard vs. Control Panel) for what is otherwise identical behavior, and the empty-state Control Panel already needs a username field regardless.
