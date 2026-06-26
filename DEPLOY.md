# Deploying Sanguine to Vercel

The Next.js serverless functions need AWS credentials at runtime to (a) mint
Aurora DSQL auth tokens and (b) call Amazon Bedrock. Locally these come from
your AWS credential chain; on Vercel you provide them as environment variables.

## 1. Create a scoped IAM user (recommended over root keys)

Create an IAM user with programmatic access and attach a policy allowing:

- `dsql:DbConnectAdmin` on the cluster ARN
  (`arn:aws:dsql:us-east-1:<acct>:cluster/<cluster-id>`)
- `bedrock:InvokeModel` on the Haiku 4.5 inference profile / model

Generate an access key pair for that user.

## 2. Set Vercel environment variables

In the Vercel project → Settings → Environment Variables (Production + Preview):

| Key | Value |
|---|---|
| `DSQL_ENDPOINT` | `<cluster-id>.dsql.us-east-1.on.aws` |
| `DSQL_DATABASE` | `postgres` |
| `DSQL_USER` | `admin` |
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | _(from step 1)_ |
| `AWS_SECRET_ACCESS_KEY` | _(from step 1)_ |
| `BEDROCK_ENABLED` | `1` |
| `BEDROCK_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |
| `HOLD_TTL_SECONDS` | `90` |

> Vercel reserves some `AWS_*` names in certain integrations; if `AWS_ACCESS_KEY_ID`
> is blocked, rename to `SANGUINE_AWS_ACCESS_KEY_ID` / `_SECRET_` and read those
> in `src/lib/db.ts` + `src/lib/bedrock-intake.ts` when constructing the clients.

## 3. Deploy

```bash
npm i -g vercel
vercel login
vercel link          # create/link the project
vercel --prod        # deploy
```

Migration + seed are run once against DSQL from your machine (`npm run db:migrate`
&& `npm run db:seed`) — they don't run on Vercel. Re-seed anytime via the
in-app **Reset demo** button or `POST /api/reset`.

## 4. Grab the Team ID

`vercel teams ls` (or Vercel dashboard → Settings) → put it in the README /
Devpost submission.

## 5. Verify

Open the production URL, hit **Simulate Surge** (Strong) → `Double-Allocations`
stays `0`; flip to **Naïve** → it climbs. Type a request in the chat box to
exercise the Bedrock intake agent.
