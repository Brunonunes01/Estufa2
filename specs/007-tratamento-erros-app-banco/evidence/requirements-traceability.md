# Rastreabilidade de requisitos

| Requisito | Implementação | Teste/evidência |
|---|---|---|
| FR-001–FR-003 | `serviceError`, classificador e apresentação | `serviceError*.test.ts`, `foundation-validation.md` |
| FR-004, FR-018 | `compoundRead` com fontes e ações bloqueadas | `compoundRead.test.ts`, `legacyErrorCompatibility.test.ts` |
| FR-005–FR-007 | `operationResult`, `offlineWrite`, feedback/Auth | `essentialWriteFeedback`, `authErrorHandling`, `us1-validation.md` |
| FR-008, FR-012, FR-017 | sanitizador, buffer e sync diagnóstico | `sensitiveEvidenceContract`, `diagnosticEvidence*` |
| FR-009–FR-010 | guards de payload/tenant/contexto | `errorIntegrityGuards`, `errorTenantIsolation`, `operationContextGuard` |
| FR-011, FR-019 | UUID lógico, hash, deduplicação e IDs persistidos | `operationIdentity`, `offlineStorage`, `simpleCreationIdentity` |
| FR-013 | compatibilidade de opcionais legados | `legacyErrorCompatibility.test.ts` |
| FR-014 | erros parciais com etapas/reconciliação | `chained-write-reproduction.md`, `idempotentWriteFlow.test.ts` |
| FR-015–FR-016 | suíte, contratos SQL estáticos e rollback | `us2-validation.md`, `us3-validation.md`, `migration-rollback-review.md` |

| Critério | Evidência |
|---|---|
| SC-001 | 8/8 categorias e 32/32 apresentações |
| SC-002 | matriz de leitura composta aprovada |
| SC-003 | estados pending/confirmed/retryable/partial/terminal aprovados |
| SC-004 | contrato sensível e revisão de escopo sem valores secretos |
| SC-005 | matriz de isolamento nega todos os casos divergentes |
| SC-006 | payload obrigatório e tenant divergente rejeitados antes da mutação |
| SC-007 | 32/32 = 100%, acima de 95% |
| SC-008 | `essential-flow-regression.md` e suíte completa |
| SC-009 | nenhuma referência operacional ou alteração no banco novo abortado |
