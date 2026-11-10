# Quickstart: Validação da Auditoria de Arquitetura

Este guia valida a documentação e os limites da iniciativa. Ele não cria projeto Supabase,
não executa migrations e não acessa produção.

## Pré-requisitos

- Repositório em estado conhecido e com a Constituição disponível.
- Node.js e dependências de desenvolvimento instalados para executar a suíte disponível.
- Acesso de leitura ao código, testes, documentação e configurações do repositório.
- Nenhuma credencial de produção necessária.

## Validação documental

1. Confirmar que [spec.md](./spec.md) contém as quatro decisões da sessão de clarificação.
2. Confirmar que [research.md](./research.md) registra decisões, justificativas e
   alternativas rejeitadas.
3. Confirmar que [data-model.md](./data-model.md) descreve os registros da auditoria,
   sem propor tabelas ou migrations de produção.
4. Confirmar que [audit-report.md](./contracts/audit-report.md) contém todas as seções
   obrigatórias do relatório.
5. Confirmar que [audit-approval-gate.md](./contracts/audit-approval-gate.md) bloqueia a
   especificação do novo banco até a aprovação formal.

## Validação de escopo

Verificar manualmente que a iniciativa não criou ou alterou:

- código-fonte da aplicação;
- dependências ou versões;
- migrations ou schema;
- dados locais, de staging ou de produção;
- configuração de conexão com Supabase;
- rotas ou comportamento funcional.

## Validação automatizada disponível

Executar, quando as dependências do ambiente estiverem instaladas:

```powershell
npm run typecheck
npm run lint
npm test
```

Resultados devem ser registrados com falhas de ambiente separadas de falhas de produto.
Não instalar dependências nem executar comandos de banco como parte desta iniciativa sem
autorização específica.

## Critério de conclusão

A auditoria estará pronta para revisão quando o relatório atender ao contrato, os achados
estiverem evidenciados, as lacunas estiverem registradas e o gate puder receber o estado
**Aprovado** ou **Bloqueado**. O estado **Aprovado** é pré-requisito para a próxima
especificação do novo banco.
