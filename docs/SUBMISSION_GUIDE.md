# StockGuard - Submission Guide (CCA 2)

This guide maps the CCA 2 document to this project: what to do, in what order,
what to screenshot, what goes in the report, and how to prepare for the viva.

> The rules say every student must be able to explain and modify their own code.
> Read every file in this project before you commit it. The viva questions at the
> end are based on this code.

---

## 0. Requirement checklist (from the CCA 2 document)

| Requirement | Where it is met |
| --- | --- |
| Dynamic pages built by the server | `views/index.ejs` rendered by `app.js` |
| Form that changes data, with validation | "Add a product" form, `src/validate.js` |
| JSON API route | `GET/POST /api/products`, `GET /api/expiry-alerts` |
| `/health` route returning `{"status":"ok"}` | `app.js` |
| Footer with running commit ID | `views/index.ejs` footer, `COMMIT` in `app.js` |
| At least 3 automated tests | `test/app.test.js`, `test/expiry.test.js`, `test/badge.test.js` (18 tests) |
| Lint tool, zero warnings | ESLint, `npm run lint` |
| Dockerfile | `Dockerfile` |
| Workflow: lint, test, build, deploy | `.github/workflows/ci-cd.yml` |
| Secrets not in code | `RENDER_DEPLOY_HOOK`, `LIVE_APP_URL` in GitHub Secrets |
| 10+ meaningful commits, 1 merged PR | Section 3 below |
| README with description, local run, pipeline diagram | `README.md` |
| Report PDF, 4 to 6 pages | Section 8 below |

---

## 1. Set up your machine

Install: Git, VS Code, Node.js 22, Docker Desktop (recommended), and create a GitHub account and a Render account (sign in with GitHub).

```bash
node -v      # v20 or newer, v22 recommended
git --version
docker --version
```

## 2. Get the code running locally

1. Unzip the project and open the folder in VS Code.
2. Run:
   ```bash
   npm install
   npm test        # expect: 18 pass
   npm run lint    # expect: no output
   npm start       # open http://localhost:3000
   ```
3. Try it: add a product with an expiry date in the past, and confirm the red **Expired** badge appears and the "Expired" count goes up.
4. Try the API: `curl http://localhost:3000/api/expiry-alerts`

## 3. Build your Git history (10+ commits and a pull request)

The evaluator checks commit history, so **add the project in stages and commit after
each one** instead of uploading everything at once. Create an empty **public**
repository named `stockguard` on your GitHub account (no README, no .gitignore), then:

```bash
git init -b main
git remote add origin https://github.com/<your-username>/stockguard.git
```

Suggested commit sequence (copy the files for each step, run the checks, then commit):

| # | Add these files | Commit message |
| --- | --- | --- |
| 1 | `package.json`, `package-lock.json`, `.gitignore` | `chore: initialise Node project with Express and EJS` |
| 2 | `src/expiry.js` | `feat: add expiry date calculation and status rules` |
| 3 | `src/validate.js`, `src/inventory.js` | `feat: add product validation, in-memory store and stats` |
| 4 | `test/expiry.test.js` | `test: add unit tests for expiry calculation and stats` |
| 5 | `app.js`, `server.js`, `src/seed.js` | `feat: add Express app with /health, products API and demo data` |
| 6 | `views/index.ejs`, `public/style.css` (see the PR note below: leave out the red badge for now) | `feat: add dashboard page with add-product form` |
| 7 | `test/app.test.js` | `test: add tests for health, add product, invalid quantity and alerts` |
| 8 | `eslint.config.js` | `chore: add ESLint configuration` |
| 9 | `Dockerfile`, `.dockerignore` | `build: containerise app with Docker` |
| 10 | `.github/workflows/ci-cd.yml` | `ci: add lint, test, build and deploy pipeline` |
| 11 | `README.md`, `docs/` | `docs: add README and submission guide` |
| 12+ | The pull request below (2 commits) | see below |

Run `npm test` before each commit that touches code. If a step does not pass on its
own (for example, a file needs another file that is not committed yet), commit
the two together or reorder the steps. What matters is that each commit is a small,
understandable piece of work.

Push after step 1 and keep pushing: `git push -u origin main`.

### The pull request (required)

Use the **red expired badge** (the extra feature) as your pull request.

1. In commit 6, leave the badge out. In `views/index.ejs`, show expired products with a plain grey badge: `<span class="badge badge--out">Expired</span>`. In `public/style.css`, leave out the `.badge--expired` rule and the `.row--expired` rules.
2. Create a branch and add the badge:
   ```bash
   git checkout -b feature/expired-badge
   ```
   - In `views/index.ejs`, replace the grey badge with: `<span class="badge badge--expired">&#9888; Expired</span>`
   - In `public/style.css`, add `.badge--expired { background: var(--red); color: #fff; }` and the `.row--expired` rules (copy them from the finished `style.css`)
   ```bash
   git add . && git commit -m "feat: add red warning badge for expired products"
   git add test/badge.test.js && git commit -m "test: add test for the expired warning badge"
   npm test && npm run lint
   git push -u origin feature/expired-badge
   ```
3. On GitHub click **Compare & pull request**, wait for the green checks, and **Merge**.
4. Update your local main: `git checkout main && git pull`.

That gives you 13 commits and 1 merged pull request. You can add a second small PR (for example a new filter or a `DELETE` route) for extra evidence of Git usage.

## 4. Deploy on Render

1. Render dashboard: **New, Web Service**, connect your `stockguard` repository.
2. Settings:
   - **Language:** Docker
   - **Instance type:** Free
   - **Health Check Path:** `/health`
   - **Auto-Deploy:** **Off**
3. Create the service and wait for the first build. Open the URL and check the app loads.
4. Render, **Settings, Deploy Hook**: copy the URL.
5. GitHub repo, **Settings, Secrets and variables, Actions, New repository secret**:
   - `RENDER_DEPLOY_HOOK` = the hook URL
   - `LIVE_APP_URL` = your Render URL (optional, enables the automatic verify job)
6. Push a small change to `main` and watch the **Actions** tab. Jobs should run in order: Lint and test, Docker build, Deploy, Verify.

Notes:

- The free Render plan sleeps after inactivity, so the first request can take about 30 to 60 seconds.
- The inventory is in memory, so it resets to the demo data when Render restarts or redeploys. That is expected for this assessment.
- The footer commit ID comes from `RENDER_GIT_COMMIT` on Render. The workflow sends `&ref=<commit>` so Render deploys exactly the commit that passed the tests.
- In the `Dockerfile` the `GIT_SHA` build argument defaults to empty on purpose. If it defaulted to `"local"`, the footer on Render would always say `local`.

## 5. Prove the pipeline works (screenshots)

**Failure demo (10% of marks)**

```bash
git checkout -b demo/failing-test
```

Break a test on purpose, for example in `test/expiry.test.js` change the expected value:

```js
assert.equal(daysUntilExpiry('2026-06-22', TODAY), 8); // was 7
```

```bash
git add . && git commit -m "test: break expiry test on purpose to demo pipeline"
git push -u origin demo/failing-test
```

Open a pull request. Screenshot the **Actions** run showing the red X on *Lint and test* and the *Docker build* and *Deploy* jobs skipped. Do **not** merge it. Close the PR and delete the branch after the screenshot.

**Success demo**

Merge a passing change to `main` (your expired-badge PR works). Screenshot the run with all jobs green.

**Live site**

Open the live URL and screenshot the page with the footer commit ID visible. It must match the first 7 characters of the latest green run's commit.

Screenshots to hand in:

| # | Screenshot |
| --- | --- |
| 1 | Green pipeline: all jobs green on `main` |
| 2 | Red pipeline: test failed, deploy skipped |
| 3 | Live site with the footer commit ID (same as run in 1) |
| 4 | Dashboard showing a red Expired badge (helpful for the report) |
| 5 | `npm test` output locally, 18 passing |

## 6. Roll back a bad release (viva question 5)

```bash
git log --oneline            # find the bad commit
git revert <bad-commit-sha>  # creates a new commit that undoes it
git push                     # pipeline tests and redeploys the reverted code
```

## 7. Final checklist

- [ ] Repository is public and under my own GitHub account
- [ ] 10+ commits with meaningful messages and 1 merged pull request
- [ ] `npm test` and `npm run lint` pass locally
- [ ] No `node_modules`, `.env`, passwords or keys committed
- [ ] Workflow shows a green run on `main`
- [ ] Failed-run screenshot captured (deploy skipped)
- [ ] Live URL opens and footer shows the latest commit ID
- [ ] README has my live URL and repo URL filled in
- [ ] Report PDF named `CCA2_<PRN>_<StudentName>.pdf`
- [ ] I can explain every line of my workflow file and my code

## 8. Report outline (PDF, 4 to 6 pages)

| Section | What to write | Approx. length |
| --- | --- | --- |
| Title page | The student details table from page 1 of the CCA 2 document | 1 page |
| Problem statement and features | Food, pharmacy and retail stock expires unnoticed and stock runs out unseen. StockGuard tracks quantity and expiry, and shows a dashboard. List the features and business rules from the README | 0.5 to 1 page |
| Architecture and pipeline diagram | Browser, Express app (routes, validation, expiry logic, in-memory store, EJS view), Docker, GitHub Actions, Render. Reuse the mermaid diagram from the README | 1 page |
| Each pipeline stage with screenshot | Lint, Test, Build and smoke test, Deploy, Verify: what it does, why it is needed, screenshot | 1 to 1.5 pages |
| Failure demo | What you broke, the red run, deploy skipped, why this protects the live site | 0.5 page |
| Challenges and learning | Real problems you hit (for example date time-zone off-by-one, `GIT_SHA` default in Docker, Render cold start) and what you learned | 0.5 page |
| Links | Repository, live site, Actions page | few lines |

Write the report in your own words from your own experience of doing the steps.

## 9. Viva preparation

**From the CCA 2 document**

1. *CI vs CD?* CI runs lint and tests automatically on every push so broken code is caught early. CD automatically releases code that passed all checks on `main`, with no manual steps.
2. *What does `needs:` do?* It makes a job wait for another job and only run if that job succeeded. `build` needs `test`, and `deploy` needs `build`.
3. *Why store the deploy URL as a secret?* Anyone who knows the deploy hook URL can trigger deployments. Secrets are hidden and not stored in the repository.
4. *What if one test fails?* The `test` job fails, so `build`, `deploy` and `verify` are skipped. The live site keeps running the previous good version.
5. *How do you roll back?* `git revert <sha>` and push. The pipeline tests and deploys the reverted code.
6. *Why Docker when it already runs locally?* The container packages the same Node version and dependencies everywhere, so "works on my machine" becomes "works the same in CI and on Render".

**About this project's code**

- *Why is `createApp()` a function?* Tests create a fresh app with an empty store and a fixed date, so they are independent and repeatable.
- *Why are dates parsed as UTC?* Local time zones and daylight saving can make "days left" off by one. Comparing calendar dates in UTC avoids that.
- *Why is a product expiring today not "expired"?* Days left is 0, and the rule for expired is days left below 0. It still shows in "Expiring this week".
- *Why validate on the server when the form has `min` and `required`?* Browser checks can be bypassed. The API and `curl` skip the form completely.
- *Why redirect (303) after the form POST?* Post/Redirect/Get: refreshing the page does not submit the form twice.
- *How do you change the "this week" window to 14 days?* Change `EXPIRING_SOON_DAYS` in `src/expiry.js`.
- *How would you add a new field, for example `location`?* Add it to `validateProduct` in `src/validate.js`, the form and table in `views/index.ejs`, the seed data, and add a test.
- *Why is EJS output safe against script injection?* `<%= %>` HTML-escapes values. Only `<%- %>` would print raw HTML.
- *Why does the smoke test call `/health` in a loop?* The container needs a few seconds to start, so the job retries instead of failing on the first attempt.
- *Why `permissions: contents: read`?* Least privilege: the workflow only needs to read the code.

## 10. Ideas if you want to go beyond the minimum

- Delete or edit a product (`DELETE /api/products/:id`) on its own branch and pull request.
- Search or filter by category or status.
- Persist data (SQLite or a small JSON file) so it survives restarts.
- Show an expiry alert panel at the top of the page.
