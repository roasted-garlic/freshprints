# Brevo MCP (Cursor) setup

Local Cursor agent tooling for the [Brevo MCP server](https://developers.brevo.com/docs/mcp-protocol). This is **separate** from Cloud Functions and product email delivery — product email uses Resend today; Brevo as a send provider remains deferred.

## Project config

Committed file: `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "brevo": {
      "url": "https://mcp.brevo.com/v1/brevo/mcp",
      "headers": {
        "Authorization": "Bearer ${env:BREVO_MCP_TOKEN}"
      }
    }
  }
}
```

- Hosted remote MCP endpoint (no local Brevo package install).
- Token is **not** stored in the repo. Cursor interpolates `${env:BREVO_MCP_TOKEN}` at startup.
- Never paste a real MCP token into git or chat.

## Create an MCP token in Brevo

1. Log in to [Brevo](https://app.brevo.com/).
2. Open **Settings → SMTP & API → API Keys** (sometimes labeled **API Keys & MCP**).
3. Click **Generate a new API key**.
4. Name it clearly (e.g. `Cursor MCP — Fresh Prints`).
5. Enable **Create MCP server API key** (MCP-specific token).
6. Copy and save the token securely (shown once).

Official guide: [Brevo MCP protocol](https://developers.brevo.com/docs/mcp-protocol) · [Integration guide](https://developers.brevo.com/docs/integration-guide)

## Enable on Windows

1. Set a **User** environment variable (so GUI-launched Cursor can see it):
   - Settings → System → About → Advanced system settings → Environment Variables
   - Under **User variables** → New:
     - Name: `BREVO_MCP_TOKEN`
     - Value: your Brevo MCP token
   - Or PowerShell (current user; then fully quit Cursor):

```powershell
[System.Environment]::SetEnvironmentVariable("BREVO_MCP_TOKEN", "<paste-mcp-token-here>", "User")
```

2. Fully quit and restart Cursor (env vars load at process start).
3. Cursor Settings → **Tools & MCP** → confirm **brevo** is listed and connected.
4. Optional smoke: ask the agent to list Brevo account/tools (e.g. contacts or transactional overview). Check **Output → MCP Logs** if it fails.

## Optional: module-scoped servers

The main URL (`/v1/brevo/mcp`) exposes all modules. To narrow tools, use a module endpoint, for example contacts only:

```json
{
  "mcpServers": {
    "brevo_contacts": {
      "url": "https://mcp.brevo.com/v1/brevo_contacts/mcp",
      "headers": {
        "Authorization": "Bearer ${env:BREVO_MCP_TOKEN}"
      }
    }
  }
}
```

## Security

- Never commit real tokens into `.cursor/mcp.json` or docs.
- Do not put the MCP token in Portal or Studio client env.
- Product email secrets stay in Firebase Secret Manager — see `docs/architecture/BACKEND.md`.
- This MCP does **not** enable Brevo as a product email provider.

## Official docs

- [Brevo MCP protocol](https://developers.brevo.com/docs/mcp-protocol)
- [Tool configuration / integration guide](https://developers.brevo.com/docs/integration-guide)
- [Cursor MCP docs](https://cursor.com/docs/context/mcp)
