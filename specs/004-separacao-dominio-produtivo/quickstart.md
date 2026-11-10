# Quickstart: Validação da Separação do Domínio Produtivo

## Pré-requisitos

- Dependências instaladas na raiz do projeto.
- Ambiente de desenvolvimento ou validação, nunca produção.
- Usuário com tenant de estufa autorizado.
- Fixtures de ciclo com plantio, colheita, venda, recebimento e pelo menos uma operação offline controlada.

## Validação automatizada

```powershell
npm run typecheck
npm run lint
npm test
npm run validate
```

Resultado esperado: todas as verificações passam sem migration, schema, dependência, produção ou dado histórico alterado.

## Cenário 1 — ciclo produtivo

1. Criar ou selecionar uma estufa autorizada.
2. Registrar plantio, colheita e venda vinculados ao mesmo ciclo.
3. Confirmar que origem, tenant, vínculos e estados são aceitos.
4. Repetir com vínculo ausente, origem incompatível e estado inválido.
5. Confirmar bloqueio antes de qualquer alteração.

## Cenário 2 — equivalência dos fluxos preservados

1. Executar criação e edição de plantio.
2. Registrar colheita com pesos bruto e líquido.
3. Criar venda com pagamento imediato, prazo e cheque.
4. Corrigir ou remover recebimento conforme permissão.
5. Conferir caixa, relatórios e rastreabilidade sem alteração semântica.

## Cenário 3 — permissões e tenant

1. Repetir operações com proprietário, gerente, operador e somente leitura.
2. Confirmar que escrita, exclusão e compartilhamento seguem a matriz autorizada.
3. Tentar usar tenant divergente ou estufa de outro tenant.
4. Confirmar bloqueio sem exposição de dados externos.

## Cenário 4 — offline

1. Desconectar a rede e registrar uma operação válida de estufa.
2. Confirmar que usuário, tenant, ação e ciclo permanecem vinculados.
3. Revogar ou simular divergência de autorização antes do replay.
4. Reconectar e executar a reconciliação.
5. Confirmar que o item inválido não é aplicado e que o item válido é aplicado uma única vez.
6. Repetir a reconciliação e confirmar ausência de duplicidade.

## Cenário 5 — compatibilidade histórica

1. Consultar registros antigos que contenham referências legadas.
2. Confirmar leitura compatível quando atributos atuais não existirem.
3. Confirmar que nenhum registro é apagado, convertido ou reclassificado.
4. Confirmar que a navegação ativa não oferece Campo, Talhão ou Hidroponia.

## Referências

- Regras e entidades: [data-model.md](./data-model.md)
- Contrato de fronteira: [productive-domain-boundary.md](./contracts/productive-domain-boundary.md)
- Requisitos: [spec.md](./spec.md)

## Evidências da implementação

- `npm run typecheck`: PASS, sem erros TypeScript.
- `npm run lint`: PASS, sem erros bloqueantes.
- `npm test`: PASS, 199 testes aprovados e 0 falhas.
- Nenhuma migration, schema, dependência, produção ou dado histórico foi alterado.
