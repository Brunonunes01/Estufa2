# Contracts: Tratamento de Erros, Operações e Persistência

## 1. Contrato de erro normalizado

Toda fronteira de serviço deve produzir um erro com esta forma conceitual:

```ts
type SafeJsonValue = string | number | boolean | null | SafeJsonValue[]
  | { [key: string]: SafeJsonValue };

type AppServiceError = {
  category: 'validation' | 'authentication' | 'authorization' | 'conflict'
    | 'connectivity' | 'availability' | 'data-contract' | 'unexpected';
  code: string;
  operation: string;
  source: string;
  safeMessage: string;
  nextStep: string;
  retryability: 'never' | 'manual' | 'automatic';
  correlationId: string;
  field?: string;
  safeContext: Record<string, SafeJsonValue>;
};
```

### Invariantes

- A UI recebe apenas `safeMessage` e `nextStep`.
- O diagnóstico recebe apenas os campos serializáveis e sanitizados.
- `cause`, resposta HTTP, sessão e payload bruto não atravessam o contrato de evidência.
- Erro desconhecido é classificado como `unexpected`, nunca como sucesso.

## 2. Mapeamento mínimo de categorias

| Sinal | Categoria | Repetibilidade padrão | Próximo passo |
|---|---|---|---|
| Regra local, check ou campo inválido | `validation` | `never` | Corrigir o campo/regra indicada |
| Sessão ausente/expirada | `authentication` | `never` | Entrar novamente |
| RLS/permissão revogada | `authorization` | `never` | Trocar para conta permitida ou solicitar acesso |
| Unique/version/idempotency divergente | `conflict` | `manual` | Recarregar e revisar o registro confirmado |
| Sem rede/timeout de transporte | `connectivity` | Conforme idempotência | Manter pendente ou tentar novamente com segurança |
| Serviço remoto indisponível | `availability` | Conforme idempotência | Tentar novamente mais tarde |
| Coluna, relação ou resposta incompatível | `data-contract` | `never` | Registrar evidência e bloquear somente dependências afetadas |
| Qualquer outra falha | `unexpected` | `manual` | Repetir uma vez ou procurar suporte com correlação |

## 3. Contrato de resultado de escrita

```ts
type WriteResult<T> =
  | { status: 'pending'; logicalOperationId: string }
  | { status: 'confirmed'; logicalOperationId: string; data: T }
  | { status: 'retryable'; logicalOperationId: string; error: AppServiceError }
  | { status: 'partial'; logicalOperationId: string; completedSteps: string[]; reconciliationAction: string; error: AppServiceError }
  | { status: 'terminal'; logicalOperationId: string; error: AppServiceError };
```

### Invariantes

- Clique duplo reutiliza a operação em voo; não cria nova chave.
- Retry, fila e reinício preservam `logicalOperationId`.
- Uma interrupção sem confirmação nunca retorna `confirmed`.
- Reenvio confirmado retorna o mesmo `confirmedRef`.
- Chave igual com payload diferente retorna `conflict`.

## 4. Contrato de leitura composta

```ts
type CompoundReadResult = {
  sources: Record<string, {
    kind: 'essential' | 'auxiliary' | 'optional';
    status: 'available' | 'failed';
    data?: unknown;
    error?: AppServiceError;
    dependentActions: string[];
  }>;
  blockedActions: string[];
  degraded: boolean;
};
```

Falhas não apagam fontes válidas. Uma ação está bloqueada somente se depender de uma fonte essencial indisponível.

## 5. Contrato do buffer diagnóstico

- Chave local particionada por usuário autenticado e tenant.
- Sanitização recursiva ocorre antes de `AsyncStorage.setItem`; chaves sensíveis são removidas em qualquer profundidade de objetos e arrays.
- Limite de 200 eventos e 7 dias; os mais antigos são descartados primeiro.
- Sincronização em lotes de até 50, com o `id` original.
- Falha de diagnóstico nunca altera o resultado da operação de negócio.
- Evento de sessão/tenant anterior não é sincronizado no contexto atual.

## 6. Contrato PostgreSQL de `diagnostic_events`

### Operações permitidas

| Papel lógico | INSERT | SELECT | UPDATE | DELETE |
|---|---:|---:|---:|---:|
| Não autenticado | Não | Não | Não | Não |
| Membro do tenant | Sim, no próprio tenant | Não | Não | Não |
| `can_manage_sharing_tenant(tenant_id) = true` | Sim | Sim, no próprio tenant e somente enquanto não expirado | Não | Sim, no próprio tenant |

O banco deve preencher ou validar `actor_user_id = auth.uid()`. Todas as políticas usam o tenant da linha e as funções de autorização existentes. Grants e políticas são explícitos e testados separadamente. Eventos expirados ficam invisíveis imediatamente; uma inserção no tenant aciona limpeza dos expirados daquele tenant, e gestores podem removê-los explicitamente.

## 7. Contrato de RPC transacional idempotente

Entrada mínima:

```text
tenant_id, idempotency_key, payload
```

Saída mínima:

```text
status: confirmed | conflict
result_ref: identificador(es) confirmados
replayed: boolean
```

Regras:

1. Revalidar usuário e permissão no banco.
2. Calcular hash canônico do payload relevante.
3. Bloquear/consultar o recibo pela chave única.
4. Se confirmado com mesmo hash, retornar o resultado anterior.
5. Se a chave já existir com hash diferente, retornar conflito sem alterar dados.
6. Inserir/alterar dados de negócio e confirmar o recibo na mesma transação.
7. Não retornar mensagem SQL, stack ou payload sensível ao cliente.

## 8. Contrato de migration e rollback

- Toda migration nova aponta a falha reproduzida e os requisitos atendidos.
- Validar estrutura, segurança declarada e rollback por contratos estáticos automatizados nesta feature. Validação executável ou aplicação em banco exige processo posterior e autorização separada.
- Incluir tabela de impacto, backup necessário, verificação pós-migration e instrução de rollback.
- Migration remota e rollback exigem autorização separada; o plano não concede essa autorização.

