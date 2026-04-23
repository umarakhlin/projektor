# Monetization — first pass

Goal: the app pays for itself and gives Uma a real income, without
feeling transactional to users who are here to collaborate.

## Principles before pricing

1. Free users must get real value so the network keeps growing.
2. Paying users must get capabilities that save them time or help them
   find better collaborators — never pay-to-post-a-project.
3. Trust matters more than revenue in year one. Anything that feels
   like spam (ads, paid visibility) will hurt network effects.
4. Prefer recurring revenue (subscriptions) over one-off fees.

## Candidate models — ranked by fit

### 1. Freemium subscription (recommended primary)
- **Free tier**
  - Up to 3 active projects at a time
  - Up to 20 direct messages / month
  - Standard match score, standard filters on Talent
- **Pro tier** (~$9–14/month or ~$79/year)
  - Unlimited projects
  - Unlimited messages
  - Advanced Talent filters (skill combinations, saved searches,
    "only users active in last 7 days")
  - "Boost" one project to the top of Explore for 48 hours per month
  - Verified badge on profile
  - Early access to new features

**Why this fits**: creators who are serious about building a team get
real value; casual users keep the network alive for free.

### 2. Recruiter / team-lead tier
- For people who repeatedly assemble teams (agencies, communities,
  incubators, university clubs).
- ~$29–49/month.
- Includes: bulk invites, seats for co-owners, analytics on their
  project funnels, private Talent shortlists.
- Lower volume but much higher ARPU.

### 3. Featured project spots (light)
- Limited inventory: e.g. 5 highlighted slots in Explore per week.
- Creators can apply to be featured; we curate (not auction) to keep
  quality up.
- Price ~$19 per feature.
- Keeps the platform feeling curated rather than pay-to-win.

### 4. Success fees (advanced, later)
- If a project actually launches and collects revenue, take a very
  small fee (0.5–1%). Opt-in only.
- Strong alignment but hard to operationalize and has legal/tax
  complexity. Defer until year 2.

### 5. Services on top (later)
- Project templates marketplace (design system kits, Notion docs,
  SAFE agreements). Uma or trusted creators produce these; we take
  30%.
- Paid workshops or AMAs with successful founders.

## Models to avoid
- **Banner ads**: kills trust, low revenue at this scale.
- **Pay to post a project**: shrinks the network, the opposite of
  what we need.
- **Selling user data**: no.

## Numbers to aim for in the first 6 months
- 1,000 active users
- 2% conversion to Pro → 20 subscribers × $10 = $200 MRR
- Not a business yet — but proves willingness to pay.

## What to build first (minimum changes to enable monetization)
1. Stripe integration and a `Subscription` model on `User`.
2. Feature flags behind subscription tier (e.g. `canUseAdvancedFilters`).
3. Pricing page.
4. "Upgrade" CTA shown contextually when free user hits a limit.
5. Settings page to manage subscription.

## Open questions for Uma
- Which tier is the MVP? I'd start with Freemium + Pro only, delay
  Recruiter tier.
- Currency and market: ILS + USD? Stripe supports both.
- Launch discount? E.g. first 100 subscribers locked to $5/month
  for life as a "founding member" bonus.
