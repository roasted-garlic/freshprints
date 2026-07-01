# AI Vision Best-Practice Prompt Review

## Scope Review

Approved for implementation as a prompt-contract hardening change.

## Why Approved

* The current OpenAI path already supplies an image plus text instructions and returns structured JSON.
* The requested improvement is best addressed by upgrading the prompt contract, not by rewriting the transport layer.
* Prompt versioning keeps the change observable in AI Review and stored `aiSuggestions`.

## Constraints

* Do not migrate to a different API endpoint in this slice.
* Do not change queue sequencing, retries, settings, or renderer behavior.
* Keep all Firebase/OpenAI key handling server-side only.
