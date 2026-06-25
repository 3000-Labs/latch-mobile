# On-ramp / Off-ramp Provider Evaluation

## Context

Latch is a Stellar (XLM) wallet. Any on/off-ramp provider must support XLM natively.
The three candidates evaluated are **MoonPay**, **Coinbase Pay**, and **Alchemy**.

---

## Provider Breakdown

### MoonPay

Pure-play fiat ↔ crypto ramp. The category leader for embedded wallet on/off-ramps.

| Dimension | Detail |
|---|---|
| XLM support | ✅ Native |
| Integration | Widget embed or SDK — lowest lift of the three |
| Fees (on-ramp) | ~3.99% card · ~1.5% bank transfer |
| Fees (off-ramp) | ~1.5% + fixed fee |
| Speed (on-ramp) | Card: ~5 min · Bank transfer: 1–5 days |
| Speed (off-ramp) | ACH / SEPA: 1–5 days |
| Coverage | 150+ countries · 30+ fiat currencies |
| KYC | Fully handled on MoonPay's side — zero compliance burden on Latch |
| Off-ramp | ✅ Sell → bank account |
| White-label / revenue share | ✅ Available — Latch takes a cut of transaction fees |
| Mobile SDK | React Native SDK available |
| Trust / compliance | SOC 2 · FCA registered · EMI licensed |

**Summary:** Broadest coverage, fastest integration, confirmed XLM support, RN SDK, and a revenue share programme. Default choice.

---

### Coinbase Pay

On-ramp SDK tied to the Coinbase ecosystem. Users fund from their Coinbase balance or link a card; funds transfer on-chain directly.

| Dimension | Detail |
|---|---|
| XLM support | ✅ (XLM is listed on Coinbase) |
| Integration | SDK — best UX requires the user to have a Coinbase account |
| Fees (on-ramp) | 0% from existing Coinbase balance · 1.49–4.99% otherwise |
| Fees (off-ramp) | Via Coinbase account only |
| Speed (on-ramp) | Near-instant from existing Coinbase balance |
| Speed (off-ramp) | 1–3 days (ACH) |
| Coverage | US-first · international expanding but patchy |
| KYC | Fully delegated to Coinbase |
| Off-ramp | ⚠️ Requires user to hold a Coinbase account |
| White-label / revenue share | ❌ No revenue share — Coinbase retains fees |
| Mobile SDK | Available; some flows deep-link into the Coinbase app |
| Trust / compliance | Highest (NASDAQ: COIN · publicly regulated) |

**Summary:** Best UX and lowest fees for US users who already have Coinbase accounts. Weak off-ramp story for everyone else. No revenue share.

---

### Alchemy

> **Clarification required** — two unrelated companies share this name:
>
> - **Alchemy (infrastructure)** — Ethereum node provider. Their on-ramp is an aggregator routing through MoonPay / Transak / Coinbase under the hood. No confirmed Stellar support.
> - **Alchemy Pay** (separate company, ticker ACH) — Asia-focused fiat ↔ crypto gateway with card processing and local payment rail support.

| Dimension | Detail |
|---|---|
| XLM support | ⚠️ Alchemy infra: unlikely · Alchemy Pay: unconfirmed — verify directly |
| Integration | Alchemy Pay: SDK + API |
| Fees | ~2–3.5% typical |
| Speed | Similar to MoonPay for card purchases |
| Coverage | Alchemy Pay: strong in Asia / Southeast Asia · weak in Western markets |
| Off-ramp | ✅ Alchemy Pay supports off-ramp |
| White-label / revenue share | ✅ Alchemy Pay white-label available |
| Trust / compliance | Less established than MoonPay / Coinbase in Western markets |

**Summary:** Only compelling if the primary audience is Asia / SEA and local rails (GrabPay, Alipay, etc.) matter. Otherwise no meaningful advantage over MoonPay.

---

## Head-to-Head

| | MoonPay | Coinbase Pay | Alchemy |
|---|---|---|---|
| XLM support | ✅ | ✅ | ⚠️ |
| Off-ramp | ✅ | ⚠️ CB account required | ✅ |
| Integration speed | Fastest | Medium | Medium |
| Lowest fees | ❌ | ✅ (existing CB users) | Middle |
| Global coverage | ✅ Best | ⚠️ US-first | ⚠️ Asia-first |
| Revenue share | ✅ | ❌ | ✅ |
| Compliance burden on Latch | None | None | None |
| Mobile SDK quality | High | Medium | Medium |

---

## Recommendation

**Primary: MoonPay** — confirmed XLM, RN SDK, revenue share, global coverage, and lowest integration lift. Off-ramp is clean and self-contained.

**Secondary: Coinbase Pay** — add as an alternate option for US users with existing Coinbase accounts. The 0% fee from a CB balance is a meaningful UX differentiator for that cohort.

**Skip: Alchemy** — unless XLM support is confirmed in writing and the target user base is Asia-heavy. Adds complexity without advantage over MoonPay for this stack.

---

## Integration Pattern

Surface both providers in a **"Buy XLM" bottom sheet** with two options, similar to how Uniswap handles multi-provider on-ramp:

```
┌─────────────────────────────────┐
│  Buy XLM                        │
│                                 │
│  ┌───────────────────────────┐  │
│  │  MoonPay   · 150+ countries│  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Coinbase Pay · US · 0% fee│  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

MoonPay renders for all users. Coinbase Pay renders only when the device locale / region is US (or as a manual option the user can choose).

Off-ramp mirrors this: MoonPay as default, no Coinbase option unless the user already links a CB account.

---

## Open Questions Before Implementation

1. **Alchemy Pay XLM support** — confirm with their sales/docs before ruling in or out.
2. **Revenue share tiers** — MoonPay share percentages depend on monthly volume; get projections before committing.
3. **KYC friction audit** — both MoonPay and Coinbase Pay run their own KYC. Confirm the re-KYC experience when users switch between providers in-app.
4. **Regulatory check** — confirm MoonPay is licensed in all target markets (some markets require local licences the partner must hold).
