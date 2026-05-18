# Handle

Handle is an AI-native property maintenance platform. A tenant calls a phone number, an AI voice agent triages the issue and asks for a photo, and the moment the call ends the system automatically finds, calls, and negotiates with contractors — no human dispatcher needed.

---

## The full flow

### 1. Tenant calls in

A tenant calls the Handle phone number. AgentPhone answers and connects to our voice agent, powered by Gemini. The agent already knows who's calling — it matches the caller's phone number against the tenant directory and greets them by name, confirms their unit, and gets straight to the issue.

### 2. Active diagnosis

The voice agent doesn't just take a report — it diagnoses. On the first turn it runs two searches in parallel:

- **Moss** (semantic search) — pulls relevant maintenance knowledge for the issue being described, so the agent can ask targeted questions: *"is the leak coming from the P-trap or the wall?"*
- **Supermemory** — surfaces past jobs at this property, owner preferences, and spend caps so the agent has full context about what's happened before

The agent asks one focused question per turn. If the tenant says anything like *"this is an emergency, just send someone"*, the agent skips all diagnosis and dispatches immediately.

### 3. Photo triage

Mid-call, the agent asks the tenant to text a photo to the same number. When the MMS arrives, Gemini analyzes it — identifying what's damaged, severity, and relevant details. That analysis is stored on the job and injected into the voice agent's context on the very next turn, so it can say *"I can see from the photo that the joint is cracked — I'm dispatching a plumber now."*

### 4. Call ends → orchestrator fires

The moment the call ends, the orchestrator runs automatically:

1. **Classifies the job** — Gemini reads the full transcript (plus any photo analysis) and produces a trade, urgency level, title, and description
2. **Recalls context** — Moss searches the contractor catalog and maintenance knowledge base; Supermemory pulls past job history, owner preferences, and any contractors who received low satisfaction scores (which are filtered out)
3. **Finds contractors** — Moss-first ranking of contractors by trade and city; falls back to Browser Use for live web sourcing if the index has no hits
4. **Dials top 3 in parallel** — fires outbound calls to the three best candidates simultaneously

### 5. AI dispatcher negotiates

Each outbound call is handled by a separate AI dispatcher agent — a ten-year-veteran dispatcher persona with full negotiation authority. It opens with a job summary, asks for a price, and negotiates:

- At or below target → accept immediately
- Above target but within walk-away → push back once with a real comp anchor (*"last week we paid one-eighty for the same job"*)
- Above walk-away → politely end the call and move to the next contractor

Pricing targets and walk-away numbers are derived from past job prices in Supermemory, adjusted for urgency. The first contractor to accept wins — the others are dropped.

### 6. Payment

Once the job is complete, Handle generates a Stripe invoice for the tenant/owner. Contractor payment goes out via Sponge — on-chain USDC on Solana, settled within 48 hours of completion.

---

## What's on the dashboard

The PM dashboard shows everything in real time:

- **Jobs** — full timeline of every event from first call to payment: classification, contractor search, each dial attempt and its outcome, assignment, completion
- **Calls** — transcript of every inbound call with caller identity and visual triage results
- **Contractors** — the full contractor catalog with trades, ratings, and job history
- **Payments** — invoice status and on-chain payment tracking

---

## Integrations

| | |
|---|---|
| **AgentPhone** | Telephony — inbound STT/TTS voice calls, outbound contractor dialing, SMS/MMS |
| **Gemini 2.5 Pro** | Voice agent responses, intent classification, contractor scripts, photo analysis |
| **Moss** | Sub-10ms semantic search for contractors and maintenance knowledge |
| **Supermemory** | Persistent memory — past job prices, owner preferences, contractor track record |
| **Stripe** | Tenant/owner invoicing |
| **Sponge** | On-chain USDC contractor payments (Solana) |
| **AgentMail** | Post-job email communication |
| **Browser Use** | Live contractor sourcing when Moss has no matches |

---

## Running locally

```bash
npm install
cp .env.example .env.local  # add your keys
npm run dev
```

Start a public tunnel so AgentPhone can reach your local server:

```bash
cloudflared tunnel --url http://localhost:3000
```

Set `NEXT_PUBLIC_APP_URL` to your tunnel URL in `.env.local`. On startup, Handle will automatically register the webhook with AgentPhone and switch the triage agent to webhook mode.

Every integration has a mock implementation. Set `INTEGRATION_MODE=mock` in `.env.local` to run the full flow with no real API keys — the seed data populates tenants, properties, units, and contractors for demo purposes.
