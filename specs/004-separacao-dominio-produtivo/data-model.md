# Data Model: Separação do Domínio Produtivo

## Ciclo de estufa

Representa a unidade operacional que conecta uma estufa autorizada ao plantio, às colheitas e às vendas relacionadas.

| Campo conceitual | Regra |
|---|---|
| tenant | obrigatório e igual ao tenant ativo autorizado |
| estufa | obrigatório em novas operações produtivas |
| plantio | vínculo do ciclo quando a operação depende de produção plantada |
| status | transição válida conforme o estado atual do ciclo |
| datas | datas coerentes para início, plantio, previsão e encerramento |
| origem | somente estufa convencional em novas escritas |

## Regra produtiva

Validação determinística reutilizada por entradas online e offline.

- **Origem**: estufa obrigatória; talhão ou origem mista são rejeitados em novas escritas.
- **Tenant**: identificador normalizado, presente e igual ao escopo autorizado.
- **Vínculo**: referências entre estufa, plantio, colheita e venda devem pertencer ao mesmo tenant e ser compatíveis com o ciclo.
- **Estado**: transições impossíveis ou ações após encerramento devem ser bloqueadas sem alterar dados já válidos.
- **Permissão**: leitura, escrita, exclusão e compartilhamento seguem a matriz da spec 003.

## Colheita

Registra produção vinculada a plantio/estufa e pode originar venda, rastreabilidade e movimentos financeiros.

- Deve preservar pesos bruto e líquido quando disponíveis.
- Pode manter compatibilidade de leitura para atributos ausentes em registros antigos.
- Exclusão deve respeitar autorização e efeitos vinculados existentes.
- Alterações financeiras não podem misturar valor combinado com valor efetivamente recebido.

## Venda e recebimento

Representa a comercialização da produção e seu estado financeiro.

Estados conceituais preservados:

```text
pendente/atrasado -> pago
pendente/atrasado -> cheque em mãos -> pago/compensado
```

- Valor combinado permanece independente do valor recebido.
- Cheque pendente não aumenta o saldo recebido real antes da compensação.
- Correções e remoções de recebimento devem preservar histórico e evitar duplicidade.
- Venda criada em fluxo ativo deve ter origem de estufa válida.

## Operação offline pendente

Representa uma intenção de criação, edição, exclusão ou transição aguardando reconciliação.

Campos conceituais:

- ação produtiva;
- payload da operação;
- usuário autenticado de origem;
- tenant de origem;
- referência ao ciclo/registro quando aplicável;
- permissões capturadas para enqueue;
- tentativas e resultado da reconciliação.

Transições:

```text
preparada -> pendente -> aplicada
                    -> falha de autorização
                    -> retry por falha transitória
```

Falha de autorização não deve ser reaplicada silenciosamente; falha transitória mantém o contrato de retry existente.

## Registro histórico legado

Dado preservado para leitura ou compatibilidade. Não pode ser convertido automaticamente em uma nova operação ativa nem criar seleção operacional de Campo, Talhão ou Hidroponia.
