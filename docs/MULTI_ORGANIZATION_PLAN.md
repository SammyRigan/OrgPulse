# Multi-Organization Assessment System – Architecture Plan

## Overview

OrgPulse will support:
- **Admin** creates/manages organizations and sets default or per-org questions
- **Organizations** invite employees by email; only complete assessments when a threshold % is met
- **Employees** receive invite links, complete the assessment once
- **Organizations** generate the analysis only after the completion threshold is met

---

## Data Model (Firestore)

```
organizations/
  {orgId}/
    name: string
    thresholdPercent: number          // e.g. 80 – need 80% completion to generate analysis
    useDefaultQuestions: boolean      // true = use global default, false = use org-specific
    createdAt, updatedAt

  {orgId}/questions/                  // subcollection – only used when useDefaultQuestions = false
    {questionId}/
      text, scoreKey, order, options[]

  {orgId}/campaigns/                  // each "round" of invites = one campaign
    {campaignId}/
      name: string
      status: "draft" | "active" | "closed"
      createdAt

  {orgId}/campaigns/{campaignId}/invites/
    {inviteId}/
      email: string
      token: string                   // unique token for invite link
      status: "pending" | "completed"
      completedAt?: timestamp
      responses?: { scoreKey: number }[]   // stored when employee completes

defaultQuestions/                     // global default (used when org.useDefaultQuestions = true)
  {questionId}/
    text, scoreKey, order, options[]

adminSettings/                        // singleton doc
  defaultThresholdPercent: number     // fallback when org has no threshold
```

**Simpler alternative** – flat invites with org + campaign references:

```
invites/
  {inviteId}/
    orgId: string
    campaignId: string
    email: string
    token: string
    status: "pending" | "completed"
    expiresAt: timestamp           // invite expires 10 days from creation
    completedAt?: timestamp
    responses?: Record<scoreKey, number>
    createdAt
```

---

## User Flows

### 1. Admin Flow

| Action | Description |
|--------|-------------|
| Manage default questions | CRUD on `defaultQuestions` – used by all orgs unless overridden |
| Create organization | Add doc to `organizations/{orgId}` with name, threshold, useDefaultQuestions |
| Set org questions | If `useDefaultQuestions = false`, manage `organizations/{orgId}/questions` |
| Set completion threshold | Per org: `organizations/{orgId}.thresholdPercent` |
| Create campaign | Create `organizations/{orgId}/campaigns/{campaignId}` |
| Add invites | Create invite docs with email, unique token, `expiresAt` (now + 10 days); admin copies link `/assess?token={token}` and sends manually |

### 2. Employee Flow

| Step | Description |
|------|-------------|
| Receive invite | Email contains link `https://app.com/assess?token=xyz` |
| Open link | App loads token from URL, fetches invite, validates not expired (< 10 days), shows org name + assessment |
| Complete assessment | Submit answers; update invite `status=completed`, store `responses` |
| Done | Thank-you screen |

### 3. Organization Flow

| Step | Description |
|------|-------------|
| View campaign | See total invites, completed count, completion % |
| Check threshold | If `completedCount / totalInvites >= thresholdPercent`, enable "Generate analysis" |
| Generate analysis | Aggregate all completed responses (mean per scoreKey), show radar + HUD |

---

## Route Structure

| Route | Access | Purpose |
|-------|--------|---------|
| `/admin` | Firebase Auth | Admin dashboard |
| `/admin/organizations` | Admin | List/create orgs |
| `/admin/organizations/[id]` | Admin | Org detail: questions, threshold, campaigns |
| `/admin/organizations/[id]/campaigns/[cid]` | Admin | Campaign: add invites, view completion |
| `/assess` | Public (with token) | Employee assessment – token in query |
| `/org/[orgId]` | Org users* | Org dashboard – campaigns, completion %, generate analysis |

*Org users: either same Firebase Auth users with org role, or separate org login – TBD.

---

## Question Resolution Logic

```
getQuestionsForOrg(orgId):
  org = getOrganization(orgId)
  if org.useDefaultQuestions:
    return getDocs(defaultQuestions)
  else:
    return getDocs(organizations/{orgId}/questions)
```

---

## Completion Threshold Logic

```
canGenerateAnalysis(orgId, campaignId):
  invites = getInvites(orgId, campaignId)
  total = invites.length
  completed = invites.filter(i => i.status === "completed").length
  org = getOrganization(orgId)
  threshold = org.thresholdPercent ?? 80
  return total > 0 && (completed / total) * 100 >= threshold
```

---

## Implementation Phases

### Phase 1: Data model + default questions
- Add `defaultQuestions` collection (rename/repurpose current `questions` or keep both)
- Admin: "Default questions" section – used when org has no custom questions
- Add `organizations` collection with: name, thresholdPercent, useDefaultQuestions

### Phase 2: Organizations CRUD
- Admin: list orgs, create org, edit org (name, threshold, useDefaultQuestions)
- Per-org questions UI when useDefaultQuestions = false
- Copy from default or start empty

### Phase 3: Campaigns + invites
- Admin: create campaign per org, add invite emails (batch or one-by-one)
- Generate unique token per invite
- Store in `invites` (or org/campaigns subcollection)

### Phase 4: Invite links (MVP)
- Generate invite links; admin copies and sends manually
- Invite link: `/assess?token={token}`
- Each invite has `expiresAt` (createdAt + 10 days); validate before showing assessment

### Phase 5: Employee assessment flow
- `/assess` page: read token, fetch invite, validate
- Show assessment form with org’s questions
- On submit: update invite (status, responses), show thank-you

### Phase 6: Org dashboard + analysis
- Org view: list campaigns, completion %
- "Generate analysis" enabled when threshold met
- Aggregate responses, compute mean scores per pillar, render radar + HUD
- Optional: export PDF report

### Phase 7: Org authentication (Firebase Auth + custom claims)
- Org users sign in with Firebase Auth (email/password)
- Set custom claims via Admin SDK (Cloud Function or backend): `{ orgId, role: "org_member" }`
- Restrict `/org/[id]` to users with matching `orgId` claim

---

## Decided

1. **Email delivery**: Manual link copy for MVP – admin copies invite links and sends manually.
2. **Org authentication**: Firebase Auth with custom claims for org members (e.g. `orgId`, `role`).
3. **Invite expiry**: Links expire after 10 days; store `expiresAt` on invite, validate before assessment.
4. **Multiple campaigns**: TBD – can be one-at-a-time or parallel; implement as flexible.

---

## Firestore Security Rules (Draft)

```
organizations/{orgId}:
  read: if request.auth != null;  // admin or org member
  write: if isAdmin();

organizations/{orgId}/questions:
  read: if canReadOrg(orgId);
  write: if isAdmin();

invites/{inviteId}:
  read: if request.auth != null || hasValidToken();   // token in request?
  write: if isAdmin() || isCompletingOwnInvite();     // employee can update only status+responses

defaultQuestions:
  read: if true;  // public for assessment
  write: if isAdmin();
```

*Note: "hasValidToken" and "isCompletingOwnInvite" require request validation (e.g. token in body/header); Firestore rules can’t read query params. May need a Cloud Function or API route to validate token and return invite data.*
