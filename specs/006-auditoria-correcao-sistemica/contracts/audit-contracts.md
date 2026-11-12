# Audit Contracts

Estes contratos definem como a auditoria classifica fluxos, dados, permissões, falhas, erros e evidências. Eles não substituem os contratos funcionais existentes; servem para verificá-los de maneira consistente.

## 1. Active Flow Inventory Contract

Cada fluxo ativo deve registrar:

```text
id
domain
user-visible action
actors and required permissions
preconditions
success scenario
invalid-input scenario
denied scenario (when applicable)
data reads and writes
dependent/auxiliary reads
offline policy
status and evidence
```

### Required inventory domains

| Domain | Minimum covered actions |
|--------|-------------------------|
| Identity | register, login, restore session, logout, change password |
| Tenant | bootstrap owner account, list memberships, switch account, share/revoke access |
| Dashboard | load summary, tasks and alerts; isolate failures by source |
| Greenhouse | create, list, detail, update, permitted delete |
| Production | create/update/cancel cycle; tasks, management and applications |
| Inventory | input, consumption, balance and reversal where supported |
| Harvest | create, edit, totals and linkage to cycle/greenhouse |
| Sales | create, edit, status, receipt, cancellation and deletion rules |
| Expenses | create, edit, payment, pending totals and effective dates |
| Finance | cash movements, receivables, payables, checks and summaries |
| Contacts | customers, suppliers and related reports |
| Reports | operational, financial, PDF and spreadsheet outputs |
| Settings | active settings, export and security-sensitive actions |
| Offline | queue, restart, reconnect, retry, account switch and denial |

## 2. Finding Contract

A finding is valid only when all required fields are present:

```json
{
  "id": "F006-001",
  "flowId": "FLOW-greenhouse-create",
  "category": "data-contract",
  "severity": "high",
  "reproduction": ["..."],
  "expected": "...",
  "actual": "...",
  "dataImpact": "none",
  "affectedContracts": ["DATA-estufas-altura_m"],
  "state": "reproduced",
  "regressionCaseId": null,
  "evidenceIds": ["EVID-001"]
}
```

### Acceptance rules

- `validated` requires a regression case and passing evidence.
- `blocked` requires the blocking dependency and attempted alternatives.
- `out_of_scope` requires a direct scope or constitution reference.
- Critical and high findings block feature completion unless explicitly documented as blocked and accepted by the user.

## 3. Persistence Compatibility Contract

For every active read, filter, write, aggregate or remote function call, the audit must compare:

| Concern | Application service | Versioned type | Clean-start migration |
|---------|---------------------|----------------|-----------------------|
| Name | Same semantic field/function | Same persisted name | Object exists |
| Type | Serialization and mapping agree | Compatible type | Compatible database type |
| Nullability | Required/optional behavior explicit | Matches operation | Constraint/default matches |
| Enum | Every sent/filtered value listed | Every value typed | Every value accepted |
| Relation | IDs and tenant linkage supplied | Relation represented | FK/constraint valid |
| Permission | Required operation known | N/A | Read/write/delete policy enforced |

An operation is incompatible if any required row fails, even when the current database happens to contain no record exercising it.

### Write confirmation

A successful write contract requires:

1. the remote boundary confirms success;
2. the created/updated identity is known;
3. a subsequent scoped read returns the expected state or the relevant cache is invalidated and refetched;
4. no partial related record remains after a failed atomic operation;
5. the user is not shown success before these conditions are satisfied.

## 4. Authorization Contract

### Default permission matrix

| Profile | Read | Write | Delete | Manage sharing |
|---------|------|-------|--------|----------------|
| Owner | Allow | Allow | Allow | Allow |
| Shared admin | Allow | Allow | According to explicit flag | Allow when explicitly granted |
| Operator | Allow | Allow | Deny by default | Deny |
| Guest | Allow | Deny | Deny | Deny |
| Unrelated/revoked | Deny | Deny | Deny | Deny |

### Enforcement rules

- Client guards improve UX but never replace data-boundary enforcement.
- Every operational query includes the active tenant scope.
- Membership is revalidated before replaying an offline write.
- Switching tenant invalidates or partitions cached data and authorization state.
- Owner-only actions use ownership, not only an `admin` role label.

## 5. Error Contract

| Category | User message intent | Diagnostic context |
|----------|---------------------|--------------------|
| Validation | Identify invalid input and correction | Field/rule, no sensitive value |
| Authentication | Ask user to sign in again | Session state, sanitized provider code |
| Authorization | Explain action is not permitted | Tenant/action/profile, no other-tenant data |
| Conflict | Explain duplicate or concurrent change | Entity/action/conflict kind |
| Connectivity | Explain offline/retry behavior | Network state and queue decision |
| Availability | Explain temporary service failure | Operation and dependency name |
| Data contract | Explain update/configuration incompatibility safely | Missing/mismatched contract identifier |
| Unexpected | Safe fallback with retry/support guidance | Correlation/context without secrets |

### Required behavior

- A service must not replace a useful error with a generic error without preserving the original cause.
- A compound read identifies the failing source.
- Logs must not include tokens, passwords, full session objects or another tenant's record contents.
- User-facing messages name the affected action and safe next step.

## 6. Compound Read Contract

Each source is classified:

- **essential**: failure blocks the journey because continuing would be misleading or unsafe;
- **auxiliary**: failure may degrade the screen if the missing section is identified and does not alter totals or decisions;
- **optional**: failure may be omitted with diagnostic evidence when it has no user-impacting contract.

The implementation must not label a failure from source B as a failure from source A merely because both were awaited together.

## 7. Offline Contract

- Queueable actions are explicitly enumerated; all others are `online_only`.
- Every item stores immutable authenticated user and tenant scope.
- Payload serialization is versioned and deterministic.
- Replay checks current session, membership and permission.
- Repeated replay of the same intention produces at most one durable result.
- Items for another user/tenant remain pending and are never executed in the active context.
- Legacy items without valid scope are quarantined or left pending; they are never adopted automatically.
- The UI distinguishes queued, confirmed, retryable failure and terminal failure.

## 8. Regression and Evidence Contract

Every accepted correction follows this sequence:

```text
reproduce -> capture failing contract/test -> minimal correction
-> focused validation -> related suite -> full validation -> evidence record
```

| Finding type | Minimum evidence |
|--------------|------------------|
| Pure logic | Unit regression + full validation |
| Data contract | Contract/persistence regression + clean migration validation |
| Authorization | Allowed and denied cases for two tenants |
| Offline | Integration scenario including reconnect or context switch |
| User journey | Automated supporting tests + manual acceptance record |
| Remote migration | Local/validation proof, rollback note, dry run and explicit approval |
