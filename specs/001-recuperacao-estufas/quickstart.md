# Quickstart: Validação da Recuperação e Simplificação do Estufa2

## Pré-requisitos

- Node.js e dependências instalados.
- Ambiente não produtivo ou fixtures controladas para Supabase.
- Dois tenants de teste e usuários com permissões distintas.
- Dados contendo uma estufa ativa e, separadamente, históricos de campo, talhão e hidroponia.

## Validação automatizada

Na raiz do projeto:

~~~powershell
npm run typecheck
npm run lint
npm test
npm run validate
~~~

Resultados esperados:

- TypeScript sem erros.
- ESLint sem novos erros relacionados ao escopo.
- Testes de tenant, origem de produção, offline e sincronização aprovados.
- Validação composta concluída sem alteração de dependências ou banco.

## Cenários funcionais

1. Autenticar usuário autorizado e confirmar que a operação principal abre estufas
   convencionais.
2. Percorrer tabs, ações rápidas e rotas conhecidas; confirmar ausência de Campo, Talhões,
   hidroponia e formulários de venda de campo.
3. Criar ou consultar estufa, plantio e colheita; confirmar que nenhum passo exige talhão,
   campo ou hidroponia.
4. Executar insumo, aplicação, manejo, venda, recebimento, despesa e relatório de estufa.
5. Repetir fluxos com usuários de dois tenants; confirmar isolamento de leitura e escrita.
6. Desconectar, executar operação autorizada de estufa, reconectar e confirmar persistência
   única e reconciliação.
7. Verificar retenção dos históricos de campo, talhão e hidroponia sem telas operacionais.
8. Tentar abrir rota removida por atalho ou estado antigo; confirmar bloqueio seguro.

## Evidências a registrar

- Saída dos comandos automatizados.
- Lista de rotas e ações observadas em cada plataforma suportada.
- Resultado dos cenários com dois tenants e permissões distintas.
- Resultado do ciclo offline/reconexão.
- Confirmação de que não houve operação de banco de produção nem exclusão de dados.

## Evidências da execução atual

Na validação de 2026-11-10:

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado sem erros.
- `npm test`: aprovado com 186 testes.
- A superfície operacional não expõe Campo, Talhão ou hidroponia; os testes preservam os
  contratos históricos em `src/types/` e nas migrations sem executá-las.
- Novas escritas de plantio, colheita e venda exigem `estufaId` e rejeitam `talhaoId`.
- Não foram executadas migrations, comandos Supabase, alterações de produção ou operações
  destrutivas de Git.
- A guarda de T041 exige tenant coincidente e permissão compatível para operações de
  leitura, escrita, exclusão e compartilhamento.
- A validação visual web abriu a tela de autenticação em `http://localhost:8081` sem
  erro de inicialização; não havia credenciais de teste disponíveis para percorrer o
  fluxo autenticado.

### Limites de validação restantes

- A validação autenticada manual em Android, iOS e web permanece pendente: Android não
  possui `adb`/dispositivo disponível nesta sessão, iOS não possui simulador no Windows,
  e a validação web ficou limitada à tela de autenticação por falta de credenciais de
  teste.
- Referências legadas em tipos, serviços de leitura e migrations permanecem intencionalmente
  para preservação histórica; sua remoção exige nova especificação e aprovação.

