# ScraperAPI MCP (Cursor) setup

> **2026-07-16:** Live Etsy listing cards use **Firecrawl** (`FIRECRAWL_API_KEY`), not ScraperAPI (ADR-FP-087h). This MCP remains **optional / unused** for that feature. Keep only if you want ScraperAPI for unrelated local experiments.

Local Cursor agent tooling for [ScraperAPI MCP](https://docs.scraperapi.com/integrations/llm-integrations/mcp-server). This is **separate** from Cloud Functions and the Portal product — Etsy recommendations are link-only (ADR-FP-087j).

## Project config

Committed file: `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "ScraperAPI": {
      "url": "https://mcp.scraperapi.com/mcp",
      "headers": {
        "Authorization": "Bearer ${env:SCRAPERAPI_API_KEY}"
      }
    }
  }
}
```

- Remote MCP endpoint (no Python/Docker install).
- Key is **not** stored in the repo. Cursor interpolates `${env:SCRAPERAPI_API_KEY}` at startup.
- Same env var **name** as Firebase secret `SCRAPERAPI_API_KEY` — values may differ per machine vs Secret Manager; never paste a real key into git.

## Enable on Windows

1. Create a ScraperAPI account and copy the API key from the dashboard (do not commit it or paste it into chat).
2. Set a **User** environment variable (so GUI-launched Cursor can see it):
   - Settings → System → About → Advanced system settings → Environment Variables
   - Under **User variables** → New:
     - Name: `SCRAPERAPI_API_KEY`
     - Value: your ScraperAPI key
   - Or PowerShell (current user; then fully quit Cursor):

```powershell
[System.Environment]::SetEnvironmentVariable("SCRAPERAPI_API_KEY", "<paste-key-here>", "User")
```

3. Fully quit and restart Cursor (env vars load at process start).
4. Cursor Settings → **Tools & MCP** → confirm **ScraperAPI** is listed and enabled (green/connected).
5. Optional smoke: ask the agent to scrape a public URL with ScraperAPI (e.g. a simple public page). Check **Output → MCP Logs** if it fails.

## Optional: local Python MCP

If you prefer the self-hosted server from the [official README](https://github.com/scraperapi/scraperapi-mcp):

```bash
pip install scraperapi-mcp-server
```

Replace the remote block in `.cursor/mcp.json` (or use user-level `~/.cursor/mcp.json`) with:

```json
{
  "mcpServers": {
    "ScraperAPI": {
      "command": "python",
      "args": ["-m", "scraperapi_mcp_server"],
      "env": {
        "API_KEY": "${env:SCRAPERAPI_API_KEY}"
      }
    }
  }
}
```

Note: the Python package expects env name `API_KEY`; we map it from `SCRAPERAPI_API_KEY` via interpolation.

## Security

- Never commit real keys into `.cursor/mcp.json` or docs.
- Do not put the MCP key in Portal client env.
- Functions continue to use Firebase Secret Manager only — see `docs/architecture/BACKEND.md`.

## Official docs

- [MCP Server overview](https://docs.scraperapi.com/integrations/llm-integrations/mcp-server)
- [Cursor setup](https://docs.scraperapi.com/integrations/llm-integrations/mcp-server/cursor)
- [Cursor MCP docs](https://cursor.com/docs/context/mcp)
