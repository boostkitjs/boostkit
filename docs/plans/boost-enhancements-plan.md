# Boost Enhancements Plan

Improve `@rudderjs/boost` with documentation search, multi-agent IDE support, and custom agent registration — closing gaps vs Laravel Boost.

**Status:** Not started

**Packages affected:** `@rudderjs/boost`

**Breaking change risk:** None. All changes are additive. Existing MCP tools, commands, and guideline/skill collection are untouched.

**Consumer impact:** None — boost is a dev dependency only. No runtime packages depend on it.

**Depends on:** Nothing — independent of MCP and AI plans.

---

## Goal

After this plan:

1. `search_docs` MCP tool provides semantic search over RudderJS documentation, so AI agents can look up framework APIs on demand instead of relying on stale context.
2. `boost:install` supports multiple AI agents (Claude Code, Cursor, Copilot, Codex, Gemini CLI, Windsurf) and generates per-agent config files.
3. Third-party packages and users can register custom agent adapters via `Boost.registerAgent()`.
4. Guidelines support package-version awareness (preparing for when we have multiple major versions).

---

## Non-Goals

- **Hosting a full docs site.** We build a local search index from markdown docs in the repo — not a remote API.
- **Real-time docs sync.** The index is rebuilt on `boost:update`. Not a live service.
- **Agent-specific skill formats.** Skills follow the open Agent Skills spec (SKILL.md). We don't maintain separate formats per IDE.
- **Paid docs API.** Unlike Laravel's 17k-entry hosted API, ours is local-first and open.

---

## Phase 1 — Documentation Search Tool

**What:** A `search_docs` MCP tool that searches RudderJS documentation locally.

**Approach:** Build a lightweight local search index from the markdown docs in the monorepo. No external API dependency.

**Files to create/modify:**

1. **`packages/boost/src/tools/search-docs.ts`** (new) — MCP tool:
   - On first call, builds an in-memory index from `docs/**/*.md` files in the project root and `node_modules/@rudderjs/*/README.md` files
   - Uses TF-IDF or simple keyword matching (no heavy deps)
   - Input: `{ query: string, limit?: number }`
   - Returns: ranked list of doc sections with file path, heading, and relevant excerpt
   - Caches the index for the lifetime of the MCP server process

2. **`packages/boost/src/docs-index.ts`** (new) — Index builder:
   - Scans markdown files, splits by headings (## / ###)
   - Stores: file path, heading hierarchy, content chunk, keywords
   - Simple ranking: exact match > word overlap > partial match
   - Future upgrade path: swap in embedding-based search if needed

3. **`packages/boost/src/server.ts`** (modify) — Register `search_docs` as the 11th MCP tool.

**Why local, not remote:** 
- Works offline, no API key needed
- Docs ship with the packages (README.md + docs/)
- Zero latency — in-process search
- Can upgrade to embeddings later without changing the tool interface

**Test:** Call `search_docs` with "middleware", verify it returns relevant docs sections.

---

## Phase 2 — Multi-Agent IDE Support

**What:** `boost:install` detects and configures multiple AI coding agents, not just Claude Code.

**Files to create/modify:**

1. **`packages/boost/src/agents/`** (new directory) — Agent adapters:
   ```
   agents/
   ├── types.ts           # Agent interface
   ├── claude-code.ts     # .mcp.json + CLAUDE.md
   ├── cursor.ts          # .cursor/mcp.json + .cursorrules
   ├── copilot.ts         # .github/copilot-instructions.md + .vscode/mcp.json
   ├── codex.ts           # codex CLI mcp config + AGENTS.md
   ├── gemini.ts          # .gemini/settings.json
   └── windsurf.ts        # .windsurfrules + .windsurf/mcp.json
   ```

2. **`packages/boost/src/agents/types.ts`** (new):
   ```ts
   export interface BoostAgent {
     name: string
     displayName: string
     detect(): boolean              // check if agent is likely in use
     supportsGuidelines: boolean
     supportsMcp: boolean
     supportsSkills: boolean
     installGuidelines(cwd: string, content: string): Promise<void>
     installMcp(cwd: string, command: string): Promise<void>
     installSkills?(cwd: string, skills: SkillEntry[]): Promise<void>
   }
   ```

3. **`packages/boost/src/commands/install.ts`** (modify):
   - Detect which agents are available (check for config files, CLI presence)
   - Present interactive selection (or `--agent=claude-code,cursor` flag)
   - Run each selected agent's install methods
   - Track selections in `boost.json`

4. **`packages/boost/src/commands/update.ts`** (modify):
   - Read agent selections from `boost.json`
   - Update guidelines/MCP config for each agent

**Agent config details:**

| Agent | Guidelines File | MCP Config | Skills |
|---|---|---|---|
| Claude Code | `CLAUDE.md` | `.mcp.json` | `.ai/skills/` |
| Cursor | `.cursorrules` | `.cursor/mcp.json` | `.ai/skills/` |
| GitHub Copilot | `.github/copilot-instructions.md` | `.vscode/mcp.json` | — |
| Codex | `AGENTS.md` | codex CLI config | — |
| Gemini CLI | `GEMINI.md` | `.gemini/settings.json` | — |
| Windsurf | `.windsurfrules` | `.windsurf/mcp.json` | — |

**Test:** Run `boost:install` with `--agent=cursor`, verify `.cursor/mcp.json` and `.cursorrules` are created.

---

## Phase 3 — Custom Agent Registration

**What:** Users and third-party packages can register their own agent adapters.

**Files to create/modify:**

1. **`packages/boost/src/Boost.ts`** (new) — Static registry:
   ```ts
   export class Boost {
     private static agents = new Map<string, BoostAgent>()

     static registerAgent(name: string, agent: BoostAgent): void
     static getAgents(): Map<string, BoostAgent>
     static getAgent(name: string): BoostAgent | undefined
   }
   ```

2. **`packages/boost/src/index.ts`** (modify) — Export `Boost` class and `BoostAgent` interface.

3. **`packages/boost/src/commands/install.ts`** (modify) — Merge built-in agents with registered custom agents in the selection list.

**Usage in AppServiceProvider:**
```ts
import { Boost } from '@rudderjs/boost'
import { MyCustomAgent } from './agents/MyCustomAgent.js'

Boost.registerAgent('my-agent', new MyCustomAgent())
```

**Test:** Register a custom agent, run `boost:install`, verify it appears in selections.

---

## Phase 4 — Version-Aware Guidelines

**What:** Prepare the guideline collection system for version-specific content.

**Files to create/modify:**

1. **`packages/boost/src/commands/update.ts`** (modify):
   - When scanning `@rudderjs/*` packages, read their `version` from package.json
   - Look for `boost/guidelines.md` (default) and `boost/guidelines/{major}.md` (version-specific)
   - If version-specific exists, use it; otherwise fall back to default
   - Example: `@rudderjs/orm` v2 → check `boost/guidelines/2.md`, fall back to `boost/guidelines.md`

2. **`packages/boost/boost.json` schema** (modify) — Track package versions:
   ```json
   {
     "packages": {
       "@rudderjs/orm": { "version": "0.0.1", "guideline": "default" }
     }
   }
   ```

This is lightweight prep work. Since we're at v0, no packages ship version-specific guidelines yet — but the infrastructure is ready.

**Test:** Create a mock package with both default and version-specific guidelines, verify the correct one is selected.

---

## Phase Order

| Phase | Description | Depends on |
|---|---|---|
| 1 | Documentation search tool | — |
| 2 | Multi-agent IDE support | — (parallel with 1) |
| 3 | Custom agent registration | Phase 2 (uses agent types) |
| 4 | Version-aware guidelines | — (parallel with 1-3) |

---

## Verification Checklist

- [ ] Existing boost test suite passes (no regression)
- [ ] `search_docs` MCP tool returns relevant results
- [ ] `boost:install` generates correct config for each supported agent
- [ ] `boost:update` updates all agent configs
- [ ] Custom agent registration works from AppServiceProvider
- [ ] Version-specific guideline fallback works correctly
- [ ] `pnpm typecheck` clean
- [ ] Playground `boost:install` still works end-to-end
