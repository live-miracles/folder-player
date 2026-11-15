## Repo skills

Skills live in `skills/` and are shared with Claude Code and Codex through the
symlinks `.claude/skills` and `.agents/skills`; add new ones there, not in a
tool folder.

- `app-demo` - record the README demo GIF/video and screenshots by driving the
  real app with a scripted scenario, using openly licensed demo media.

## Before committing

Run `npm test` (build and all tests) and `npm run format:check` (Prettier) and
make sure both pass before every commit. If Prettier fails, run `npm run format`
and re-check. CI runs both, so a commit that skips either can break CI.

## Releases

Follow the Publishing steps in `README.md`. After the release workflow
finishes, write release notes on the GitHub release with
`gh release edit vX.Y.Z --notes-file <file>`. Summarise what changed for users
in plain language, leave out docs, tooling and refactor-only commits, and end
with a link to the compare view from the previous tag.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `live-miracles/folder-player` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
