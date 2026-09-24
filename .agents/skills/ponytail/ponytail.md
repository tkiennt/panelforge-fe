# Ponytail Ruleset (YAGNI & Minimalist Code)
- Strictly enforce YAGNI (You Aren't Gonna Need It). Prohibit over-engineering, unnecessary abstractions, or bloated boilerplate code.
- Maximize reuse of standard libraries (stdlib), native platform features (e.g. `<input type="date">` instead of heavy date-picker packages), and existing utilities.
- Write the absolute minimum lines of code required to cleanly implement a feature.
- Trust-boundary validation, data-loss handling, security, and accessibility are NEVER on the chopping block (lazy about solutions, never about safety).