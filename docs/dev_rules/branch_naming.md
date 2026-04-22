# 📂 A3Service: Git Workflow & Quality Gates

This project uses **Husky v9** to enforce engineering standards before code reaches GitHub. These gates are designed to catch simple mistakes (like naming typos or forgotten `console.log`s) so that our Pull Request reviews can focus on actual logic rather than formatting.

---

## 🏗️ 1. Branch Naming Convention
Every branch must follow the **Conventional Commits** style for branches. This allows us to instantly see what part of the monorepo is being modified.

### The Standard Pattern:
`type(scope)/short-description`

| Component | Allowed Values | Purpose |
| :--- | :--- | :--- |
| **Type** | `feat`, `fix`, `chore`, `docs`, `refactor` | The nature of the change. |
| **Scope** | `mobile`, `api`, `shared`, `pipeline` | The specific area being touched. |
| **Description** | `kebab-case-text` | A brief summary (lowercase and hyphens). |

---

## 🛠️ 2. Troubleshooting & Shell-Specific Syntax

If Husky blocks your commit, it is usually a **Syntax Error** in how your terminal handles parentheses `()`. Use the guide below based on which terminal you are using.

### 🟦 PowerShell (Default in VS Code)
PowerShell treats parentheses as command execution triggers. If you don't use quotes, it will throw an `ObjectNotFound` error.
* **The Fix:** Always wrap the branch name in **single quotes**.
* **Command:** `git branch -m 'feat(mobile)/your-name'`

### 🟧 Git Bash / Zsh / Linux / macOS
These shells are generally more forgiving, but special characters can still trigger "globbing" or sub-shell errors.
* **The Fix:** Use **double quotes** to ensure the string is passed literally.
* **Command:** `git branch -m "feat(mobile)/your-name"`

### ⬛ Command Prompt (CMD)
CMD is the "old school" approach and handles parentheses differently than PowerShell.
* **The Fix:** You can often run the command without quotes, but **double quotes** are the safest bet.
* **Command:** `git branch -m "feat(mobile)/your-name"`

---

## 🔄 3. Common Recovery Scenarios

### "I already pushed a bad branch name to GitHub!"
You cannot "rename" a branch on GitHub; you must replace it.
1. **Rename locally:** `git branch -m 'feat(scope)/new-name'`
2. **Delete the old name from GitHub:** `git push origin --delete 'old-bad-name'`
3. **Push the correct name:** `git push origin 'feat(scope)/new-name'`

### "I can't delete the bad branch!"
You cannot delete a branch while you are currently "standing" on it.
1. **Move away:** `git checkout main` (or any other valid branch).
2. **Delete it:** `git branch -D 'bad-branch-name'`

---

## 🔍 4. Automatic Quality Gate (Linting)
Every time you run `git commit`, the system runs: `npx nx affected -t lint`.

**If it fails:**
* **Don't ignore it:** Check the terminal output for the **file path** and **line number**.
* **Fix the code:** Usually, it's a forgotten `console.log`, an unused variable, or a missing semicolon.
* **Retry:** `git add` the fix and try the commit again.

---

## 🔱 5. Lead Dev "Rules of Thumb"

1. **Keep it Atomic:** Try to keep branches focused. If you are working on the API, don't sneak in mobile UI changes.
2. **Sync Often:** Before starting a new branch, always pull the latest `main` to ensure your `nx affected` commands are accurate.
3. **Emergency Bypass:** Only use `--no-verify` if the Husky script itself is broken. Bypassing linting errors is tracked in the history and will be flagged during PR review.

---

**Questions?** Reach out to the Lead Dev or check the `.husky/` folder for the raw script logic.