# Quickstart: Reconstrução Nova da Persistência

## Pré-requisitos

- Dependências instaladas no projeto.
- Supabase CLI disponível para validação local quando as migrations forem implementadas.
- Nenhuma credencial de produção necessária nesta fase.
- Credenciais de staging serão necessárias para validação remota e geração de tipos vinculados.

## Validação local planejada

1. Criar um ambiente vazio local.
2. Aplicar a sequência completa de migrations novas.
3. Confirmar que a aplicação limpa termina sem erro.
4. Criar o primeiro usuário pelo cadastro novo e associá-lo ao tenant inicial.
5. Confirmar que nenhum usuário ou membership legado foi consultado ou importado.
6. Executar testes positivos e negativos de RLS por tenant.
7. Testar vínculos de estufa, ciclo, plantio, colheita e venda.
8. Testar estados de recebimento e auditoria.
9. Registrar falhas, pendências e evidências de rollback.

## Evidências da implementação local

- A área `supabase-new/` é isolada e a baseline pode ser recriada em banco vazio.
- A bateria de testes deve ser repetida a cada alteração antes de qualquer promoção.
- Nenhum usuário, dado histórico, dado financeiro ou registro do legado foi copiado,
  alterado ou descartado.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS, 215 testes aprovados e 0 falhas.

## Aplicação remota isolada

- Projeto novo: `Agro_Estufa` (`okzvcnslwttslkngvexr`).
- Região: `sa-east-1`.
- `supabase db push --remote`: PASS; migrations `0001` a `0012` aplicadas.
- Verificação posterior com `--dry-run`: PASS; banco remoto sem migrations pendentes.
- O projeto é separado de `EstufaOS` e `estufa360`; nenhum dado legado foi copiado.
- Isso não constitui staging de cutover nem aprovação de produção do aplicativo.

## Validação do cliente

```powershell
npm run typecheck
npm run lint
npm test
```

Esses comandos validam o cliente sem exigir conexão remota. Testes de integração com o novo ambiente serão adicionados quando houver ambiente local/staging configurado.

## Gate remoto

O gate remoto permanece pendente até que as credenciais sejam fornecidas. Depois disso, executar a baseline em staging, gerar os tipos vinculados, repetir os testes de segurança e registrar a aprovação. Não aplicar em produção nem realizar cutover sem confirmação explícita.

## Referências

- [Modelo de dados](./data-model.md)
- [Contrato da baseline](./contracts/persistence-baseline.md)
- [Spec](./spec.md)
