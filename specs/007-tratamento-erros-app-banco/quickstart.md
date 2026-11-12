# Quickstart: Validação do Tratamento de Erros

## Objetivo

Executar a validação da feature por testes TypeScript, contratos SQL estáticos e jornadas essenciais. Esta feature não utiliza Docker, Supabase local nem executa migrations em qualquer banco.

## Pré-requisitos

- Node.js e dependências já instaladas.
- Nenhum Docker, Supabase CLI ou banco local é necessário.
- Fixtures de duas contas em tenants distintos e perfis com permissões diferentes.

## 1. Baseline antes da implementação

```powershell
npm run typecheck
npm run lint
npm test
```

Registrar qualquer falha preexistente sem suprimir testes.

## 2. Validação focada dos contratos

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/serviceError.test.ts tests/compoundRead.test.ts tests/offlineStorage.test.ts tests/syncServiceIntegration.test.ts tests/contract/sensitiveEvidenceContract.test.ts
```

Resultados esperados:

- As oito categorias possuem código, mensagem segura e próximo passo.
- Contexto sensível é removido antes de armazenamento.
- Falha essencial preserva fontes independentes e bloqueia apenas ações dependentes.
- Reenvio mantém a mesma chave lógica e não duplica execução confirmada.
- Troca de tenant mantém itens isolados.

## 3. Validação estática da persistência

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/persistence
npm run typecheck
```

Os testes leem as migrations como artefatos versionados e verificam declarativamente schema, constraints, grants, RLS, retenção, idempotência e rollback. Eles não executam SQL.

Verificar:

- Migration possui DDL incremental compatível com a baseline versionada e rollback documentado.
- `diagnostic_events` possui grants, RLS e índices esperados.
- Usuário não autenticado não insere nem lê.
- Membro insere somente no próprio tenant e não lê evidências.
- Somente owner/admin que satisfaça `can_manage_sharing_tenant` lê/exclui no próprio tenant; operator/guest não lê evidências.
- Evento repetido com o mesmo `id` não duplica.
- Evento com mais de 30 dias fica invisível imediatamente e é removido na próxima inserção do mesmo tenant.
- RPC idempotente repete o resultado para a mesma chave/hash e rejeita chave igual com hash diferente.
- A definição da RPC usa uma única função transacional e não confirma recibo fora da operação.
- `src/types/supabase.ts` corresponde ao DDL revisado por teste estático e typecheck.

Aplicação da migration e testes executáveis de RLS ficam explicitamente fora desta feature e exigem processo posterior autorizado.

## 4. Jornadas manuais essenciais

Executar no Expo Web e em pelo menos um dispositivo móvel:

1. **Login**: expirar a sessão antes de uma ação protegida; confirmar orientação para entrar novamente e ausência de sucesso falso.
2. **Painel**: falhar uma fonte auxiliar e depois uma essencial; confirmar dados preservados e bloqueio somente das ações dependentes.
3. **Ciclo**: enviar payload inválido e tentar operar em tenant divergente; confirmar rejeição sem escrita parcial.
4. **Venda**: acionar salvar duas vezes, interromper a rede após envio e reenviar; confirmar uma única venda e os mesmos itens.
5. **Despesa**: criar offline, reiniciar o app e reconectar; confirmar estado pendente seguido de uma única confirmação.
6. **Troca de tenant**: iniciar leitura/escrita, trocar a conta e aguardar a resposta; confirmar que o contexto anterior não atualiza a nova tela.

## 5. Evidência e retenção

- Inspecionar o buffer local sem copiar segredos para o relatório.
- Confirmar limite de 200 eventos e remoção dos eventos locais com mais de 7 dias.
- Sincronizar e confirmar lote máximo de 50 eventos.
- Confirmar que eventos remotos expirados não aparecem e são elegíveis para limpeza após 30 dias.
- Buscar por padrões proibidos nas evidências versionadas:

```powershell
rg -n -i "access_token|refresh_token|authorization:|password\s*[:=]|secret\s*[:=]" specs/007-tratamento-erros-app-banco
```

O comando deve retornar somente menções explicativas/contratuais, nunca valores reais.

## 6. Gate final

```powershell
npm run validate
```

A feature está pronta para revisão quando:

- Os cinco fluxos essenciais passam online e nos cenários offline aplicáveis.
- Não há duplicidade, sucesso sem confirmação ou mistura entre tenants.
- Falhas parciais têm estado e reconciliação explícitos.
- Nenhuma evidência contém segredo ou registro de outro tenant.
- Rollback das migrations está documentado e coberto por contrato estático.
- O banco novo abortado permanece sem uso ou alteração.

