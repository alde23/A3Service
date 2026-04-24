# 💬 A3Service: Commit Message Standards

We follow the **Conventional Commits** specification. This ensures our project history is readable, searchable, and professional.

---

## 🏗️ 1. The Standard Pattern
`type(scope): description`

> **Note:** Notice the colon `:` and the space after the parentheses. This is a strict requirement.

| Component | Allowed Values | Examples |
| :--- | :--- | :--- |
| **Type** | `feat`, `fix`, `chore`, `docs`, `refactor`, `ci` | `feat(...)`, `fix(...)` |
| **Scope** | `mobile`, `api`, `shared`, `pipeline`, `ci` | `(api)`, `(mobile)` |
| **Description** | Any concise, lowercase text | `add user login logic` |

---

## ⚖️ 2. Why This Matters (The Justification)

1. **The "Nx Magic" (Remote Caching):** Nx Cloud uses your commit history to track changes. Properly scoped commits help the cache stay "warm," meaning if you only touch the API, your teammates don't have to re-run mobile tests.
2. **Atomic History:** When we need to "revert" a mistake, having a message like `fix(api): fix database connection leak` makes it 100x easier to find than `fixed it`.
3. **Professionalism:** This project is built to industry standards. Learning these conventions now prepares us for working at top-tier engineering firms.

---

## 🛠️ 3. Troubleshooting

### "My commit was rejected by Husky!"
1. **Check the Type:** Did you use one of the allowed types? (e.g., `test` is not allowed, use `chore` or `feat`).
2. **Check the Colon:** Did you forget the `: `? 
   * ❌ `feat(api) add login`
   * ✅ `feat(api): add login`
3. **Check the Scope:** Is the scope wrapped in parentheses?

### "I made a typo in my last commit message!"
If you haven't pushed to GitHub yet, you can fix the most recent commit message:
`git commit --amend -m "feat(api): the correct message"`

---

## 💡 4. Pro-Tips for Speed

* **Be Concise:** The description should be short. If you need to explain *why*, add a blank line after the description and write a body paragraph.
* **Imperative Mood:** Write the description as if you are giving a command.
  * ✅ `feat(api): add user auth` (Correct)
  * ❌ `feat(api): added user auth` (Incorrect)