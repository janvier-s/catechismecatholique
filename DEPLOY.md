# Deployment guide

The site deploys to **Cloudflare Pages** via the GitHub Actions workflow at
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

- `push` to `main` → production deploy at the Pages alias + custom domain
- `pull_request` → preview deploy, URL posted as a comment on the PR
- `workflow_dispatch` → manual run from the Actions tab

The CI workflow at [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs
lint, type-check, unit tests and a build on every push and PR. Deploys are
gated on nothing right now — wire `needs: ci` if you want the deploy to wait
on a green CI.

---

## One-time Cloudflare setup

### 1. Cloudflare account + domain on Cloudflare DNS

If the account isn't created yet: <https://dash.cloudflare.com/sign-up>.

To put `catechismecatholique.fr` on Cloudflare DNS (required for the smooth
custom-domain flow on Pages):

- Dashboard → **+ Add a domain** → `catechismecatholique.fr` → Free plan
- Cloudflare returns two nameservers (e.g. `xyz.ns.cloudflare.com`,
  `abc.ns.cloudflare.com`)
- At the registrar where the domain was bought, replace the existing
  nameservers with these two
- Activation: usually 5–30 min; an email confirms

### 2. Capture the Account ID

Pick the domain in the dashboard → it's shown in the right sidebar under
**Account ID** (32-char hex). You'll need it as a secret in step 6.

### 3. Create the Pages project

Either via CLI (recommended — wrangler is already in `devDependencies`):

```bash
npx wrangler login                         # one-time browser OAuth
npx wrangler pages project create lecatechisme --production-branch=main
```

…or via the dashboard: **Workers & Pages → Create application → Pages →
Direct Upload**, name it `lecatechisme`.

> Don't use the dashboard's **Connect to Git** option — the deploy workflow in
> this repo handles the GitHub side itself, and the two paths would conflict.

The project name (`lecatechisme`) is what goes into the `CF_PAGES_PROJECT`
secret. Pick a different name if you want — just keep it consistent with the
secret.

### 4. (Optional) KV namespace for `/recherche`

The `/recherche` page is backed by a Cloudflare KV namespace bound as
`SEARCH_INDEX`. Without it the rest of the site works fine, but search
returns 500.

**A. Skip it for the first deploy** — open `wrangler.toml`, comment out the
`[[kv_namespaces]]` block, deploy, come back to this later.

**B. Set it up properly:**

```bash
npx wrangler kv namespace create SEARCH_INDEX
npx wrangler kv namespace create SEARCH_INDEX --preview
```

Each command prints an ID. Paste them into `wrangler.toml`, replacing
`REPLACE_WITH_KV_ID_AFTER_CREATING` and `REPLACE_WITH_KV_PREVIEW_ID`. Then
upload the prebuilt index:

```bash
npm run upload-index
```

### 5. Create the Cloudflare API token

<https://dash.cloudflare.com/profile/api-tokens> → **Create Token → Custom
Token**:

| Permission                   | Access                        |
| ---------------------------- | ----------------------------- |
| Account → Cloudflare Pages   | Edit                          |
| Account → Workers KV Storage | Edit (omit if you skipped KV) |
| Account Resources            | Include → your account        |

Save the resulting token string — Cloudflare only shows it once.

### 6. Add the three GitHub secrets

```bash
gh secret set CLOUDFLARE_API_TOKEN          # paste the token from step 5
gh secret set CLOUDFLARE_ACCOUNT_ID         # paste the ID from step 2
gh secret set CF_PAGES_PROJECT --body lecatechisme
```

Or via the UI: <https://github.com/janvier-s/catechismecatholique/settings/secrets/actions>.

### 7. Trigger the first deploy

Push any commit, or run the workflow manually:

```bash
gh workflow run Deploy
```

Once green, the site is live at `https://lecatechisme.pages.dev` (or whatever
project name you chose).

### 8. Custom domain

In the dashboard: **Pages → lecatechisme → Custom domains → Set up custom
domain → `catechismecatholique.fr`**. Cloudflare auto-creates the DNS record
and provisions the cert. A few minutes later the apex serves the site.

If you also want `www.catechismecatholique.fr`, repeat the same flow with
`www.` and Cloudflare will redirect to the apex (or vice versa, your call).

---

## Day-to-day

- Push to `main` → production deploys
- Open a PR → preview deploys, URL appears as a bot comment that updates on
  each subsequent push (no comment spam)
- Cancel a stale run from the Actions tab if needed; concurrency is set to
  cancel superseded runs on the same ref

## Re-generating the Open Graph image

```bash
npm run generate-og-image
```

Writes `static/img/og-image.png` and `static/img/og-image.webp`. Commit the
new files — the homepage references them via absolute URL.

## Re-generating the catechism data

```bash
npm run prepare-data
```

Runs `scripts/prepare-data.ts` to rebuild every JSON under `static/data/ccc/`
from the upstream catechism source. The build runs this automatically via
`prebuild`.

## Troubleshooting

- **CI fails on `prettier`** — run `npx prettier --write .` locally and commit
  the result
- **Deploy fails with KV binding error** — either create the namespace
  (step 4B) or comment out the `[[kv_namespaces]]` block in `wrangler.toml`
- **`/recherche` returns 500 after deploy** — KV namespace exists but the
  index hasn't been uploaded; run `npm run upload-index`
- **Custom domain stuck on "verifying"** — DNS hasn't propagated; the apex
  record (`@`) needs to point at the Pages project. Cloudflare creates this
  automatically when the domain is on Cloudflare DNS
