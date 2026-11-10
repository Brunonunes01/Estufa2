# Contrato do Relatório de Auditoria

O relatório é a entrega formal da iniciativa e deve ser legível por responsáveis de
produto, engenharia e dados. Ele descreve o estado observado, não executa mudanças.

## Estrutura obrigatória

1. **Resumo e escopo**: objetivo, domínio de estufas, fluxos incluídos e exclusões.
2. **Inventário de módulos**: módulos avaliados, responsabilidades e evidências.
3. **Mapa de dependências**: relações entre telas, domínio, persistência, segurança,
   sincronização e serviços externos.
4. **Catálogo de regras**: regras observadas, localização, fonte de verdade, duplicidade e
   cobertura conhecida.
5. **Contratos preservados**: comportamento de estufas, financeiro, tenant, permissões,
   offline e integridade.
6. **Matriz de riscos**: achado, impacto, prioridade, dependências, regressão e evidência.
7. **Lacunas de testes**: comportamento sem evidência suficiente e validação necessária.
8. **Melhorias candidatas**: limites de responsabilidade, ordem sugerida e necessidade de
   especificação posterior.
9. **Limitações e decisões pendentes**: informações não verificadas e decisões que
   bloqueiam o novo banco.
10. **Conclusão e aprovação**: parecer de prontidão ou bloqueio para a próxima iniciativa.

## Regras do contrato

- Cada afirmação relevante deve apontar para evidência verificável.
- Problemas e recomendações devem ser separados de contratos preservados.
- A ausência de evidência deve ser explícita.
- O relatório não pode conter código de implementação, migrations ou autorização de
  alteração de dados.
- O relatório só pode liberar a especificação do novo banco após aprovação formal.
