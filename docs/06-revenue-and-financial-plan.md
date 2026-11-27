## Decisions made

- **Assumption.** Use USD for planning, accept paid web orders through Gumroad direct links, and reconcile actual settlements in THB. Budget zero advertising spend.
- **Estimate.** Cap startup and operating cash outlay through December at $69, plus fees deducted from transactions. Carry a separate 5% of gross allowance for refunds and disputes.
- **Estimate.** Ten $19 card sales generate $190 gross, $157.49 after modeled fees and $78.99 after the risk allowance and planned outlay. Founder labor and income tax are excluded from that last figure.
- **Assumption.** Use bank deposits as a separate success measure. Seven $19 sales by Dec 11 would put the modeled net balance above $100 before refunds. Review, eligibility, holidays and bank processing determine when cash arrives.

# Revenue and financial plan

### Cash budget

| Cost | Build through Dec 31 | Each month Jan–Mar | Basis |
|---|---:|---:|---|
| Domain | $15 | $0 | **Estimate.** Allow $15 for one ordinary annual registration. Check availability and actual renewal before purchase. [Registrar price lookup](https://pricing.registrar.cloudflare.com/?q=com) (accessed 2026-11-26). |
| Cloudflare storefront, D1, public media, owner access | $0 | $0 | **Assumption.** Stay inside free allowances with compressed public previews, three listings and one owner. Deliver ZIPs through Gumroad. Check usage weekly. [Workers](https://developers.cloudflare.com/workers/platform/pricing/) · [D1](https://developers.cloudflare.com/d1/platform/pricing/) · [R2](https://developers.cloudflare.com/r2/pricing/) (accessed 2026-11-26). |
| Commercial proof-generation plan | $30 | $15 | **Estimate.** Allow two $15 billing cycles starting Nov 27 and monthly renewals from Jan 27. Kling illustrates Standard around $10. Confirm price, territory, plan and required credits in the founder's checkout. [Kling credit guide](https://kling.ai/blog/kling-video-3-0-credit-cost-guide?tab=all) · [Paid terms](https://kling.ai/docs/payment-policy) (accessed 2026-11-26). |
| Additional proof iterations | $15 | $0 | **Assumption.** One startup retry allowance beyond included credits. Drop an unproven character if the allowance runs out. Buyers pay for their own generation. |
| Analytics | $9 | $9 | **Fact.** Plausible lists Starter at $9/month and a 30-day trial. **Estimate.** Fund one December payment and one per Q1 month. [Plausible pricing](https://plausible.io/#pricing) (accessed 2026-11-26). |
| Commerce subscription, acquisition, email and coding tools | $0 | $0 | **Assumption.** Gumroad has no monthly charge. Use the founder's existing device, editor and reply inbox. No paid reach, commissions, contractors or incremental AI coding seat. [Gumroad fees](https://gumroad.com/help/article/66-gumroads-fees) (accessed 2026-11-26). |
| **Planned outlay** | **$69** | **$24** | **Estimate.** $141 across startup, December and all of Q1. Any incremental legal, tax or asset-clearance quote is outside this allowance. Hold the affected sale if required clearance is unaffordable. |

### One pack, one order

**Fact.** Gumroad's direct web fee article excludes card processing from its headline price. Direct card modeling therefore uses 10% + $0.50 plus 2.9% + $0.30. Discover charges a different 30% fee. A web refund can leave payment-processing cost unrecovered. Use the actual sales CSV for taxes, fees, payment method and refunds. [Fees and refunds](https://gumroad.com/help/article/66-gumroads-fees) · [Sales export](https://gumroad.com/help/article/74-the-analytics-dashboard) (accessed 2026-11-26).

| Estimate per direct card order | Intro $19 | Standard $29 |
|---|---:|---:|
| Fee = 0.129 × price + $0.80 | $3.25 | $4.54 |
| Seller proceeds before costs | $15.75 | $24.46 |
| Risk allowance = 5% × gross | $0.95 | $1.45 |
| Contribution available for overhead | **$14.80** | **$23.01** |

**Estimate — cash break-even.** Five introductory sales cover $69 of startup/December spending (5 × $14.80 ≈ $74). At $29, two full-price sales cover a $24 operating month. “Break-even” here means positive contribution after planned cash spending and allowance. It does not pay the founder a salary. The conservative scenario shows how a business that crosses cash break-even can still return very little for the work.

**Estimate — time cost.** For a time-value sensitivity, assign $15/hour to founder work. At 98 build/validation/buffer hours plus an upper bound of 24 selling hours, the labor allowance is $1,830. Some acquisition time overlaps the pilot and the 14-hour buffer may go unused. A fully costed launch at the upper bound needs about **87 orders** across the $19/$29 ladder to cover $1,899 ($1,830 + $69). Ten orders are evidence of demand, not a sustainable wage. Use actual hours for the next decision.

### Scenarios through Q1 2027

**Assumptions for all scenarios.** One pack per distinct new buyer, one direct card order per pack, USD prices before buyer tax, ten introductory units over the **lifetime of the promotion**. Unsold introductory places carry into Q1. Zero actual returns in the example cash ledger, with 5% of gross withheld in the forecast as a risk allowance. No sales on Dec 31 assumed solely to bridge the Dec 30 target to month-end. No repeats, new SKUs or price increases needed for the projection. Q1 covers Jan 1–Mar 31 and assumes the same catalog, continued organic selling effort and functioning distribution.

| Estimate | Dec visitors → buyers | Jan visitors → buyers | Feb visitors → buyers | Mar visitors → buyers | Conversion assumption |
|---|---|---|---|---|---|
| Conservative | 200 → 2 | 200 → 2 | 300 → 3 | 300 → 3 | 1% |
| Base | 500 → 10 | 500 → 10 | 600 → 12 | 700 → 14 | 2% |
| Optimistic | 800 → 24 | 1,000 → 30 | 1,200 → 36 | 1,400 → 42 | 3% |

| USD estimate | Dec gross / surplus | Jan gross / surplus | Feb gross / surplus | Mar gross / surplus | Q1 gross / surplus | Launch through Mar gross / surplus |
|---|---:|---:|---:|---:|---:|---:|
| Conservative | 38 / −39.40 | 38 / 5.60 | 57 / 20.40 | 57 / 20.40 | 152 / 46.39 | 190 / 6.99 |
| Base | 190 / 78.99 | 290 / 206.09 | 348 / 252.11 | 406 / 298.13 | 1,044 / 756.32 | 1,234 / 835.31 |
| Optimistic | 596 / 401.12 | 870 / 666.27 | 1,044 / 804.32 | 1,218 / 942.38 | 3,132 / 2,412.97 | 3,728 / 2,814.09 |

**Estimate — calculation.** For each period, surplus = gross − (12.9% × gross + $0.80 × orders) − 5% × gross − planned outlay. Round at the end of the period. Subtotals can differ by a cent from rounded monthly figures. This estimates operating contribution after risk allowance, before founder pay, income tax and FX effects. It is not an accounting treatment for MoR revenue or an estimate of bank cash on a particular date.

**Estimate — downside.** If one of ten $19 orders refunds, gross less refunds falls to $171. The seller could keep roughly $140.89 before expenses under Gumroad's documented return of its own fee and retention of underlying processing, assuming no tax or FX effects. That leaves nine retained buyers. Replace the allowance with realized losses for the settled cohort to avoid charging the same refund twice. One unresolved dispute or delayed payout can materially alter a ten-order month. [Fee policy](https://gumroad.com/help/article/66-gumroads-fees) (accessed 2026-11-26).

### Cash and management controls

**Fact.** Gumroad lists THB bank payouts for Thailand. Its help page lists both a standard $100 threshold and a Thailand entry of ฿600. It also describes review, an eligibility hold and bank processing delays. **Assumption.** Plan against $100 until the verified dashboard resolves the conflict. Seven introductory direct card orders yield about $110.24 before refunds. A late-December success can leave $0 deposited in December. Check the statement and record THB separately from USD proceeds. [Gumroad payout schedule and country table](https://gumroad.com/help/article/13-getting-paid) (accessed 2026-11-26).

| KPI | Decision |
|---|---|
| Measured visitors → qualified detail views → checkout clicks → retained buyers | **Assumption.** Inspect weekly by channel and price cohort. Use the ten-buyer, $190 December target and the thresholds in [12](12-launch-roadmap.md). |
| Realized contribution and buyers per founder hour | **Assumption.** Shift hours toward the channel that produced real orders. Defer paid traffic until observed contribution can cover acquisition, refunds and time. |
| Earned proceeds / eligible balance / payout sent / THB received | **Assumption.** Record all four dates or amounts. Chase verifier requests immediately. Record December cash as zero if the bank has not credited it. |
| Refunds, disputes, delivery failures | **Assumption.** Show counts and denominators. Investigate each at this volume. Keep cash for outstanding refund obligations even after a payout. |

**Assumption — rejected choices.** A subscription assumes recurring demand before a single pack has sold. Paid acquisition would spend the launch allowance before channel conversion or lifetime value is established. See the seller, tax and refund assumptions in [05](05-business-model.md) and [10](10-risk-and-legal-assessment.md).

## Assumptions & open questions

- Can the founder produce each proof under the Standard plan and existing credits, with only $15 extra for retries?
- What card, tax, FX and refund deductions appear on the first Thai payout statement? Replace modeled proceeds with those figures.
- Are any paid professional advice or registration costs required before the first sale? Obtain the amount and rerun break-even before committing spend.
