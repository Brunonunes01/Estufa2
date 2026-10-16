# Prompt Inicial — Novo App Comercial de Gestão de Estufas

Use este prompt para iniciar um novo projeto do zero, com arquitetura limpa, profissional, preparada para crescimento e com qualidade de produto pronto para venda.

## Objetivo

Criar um aplicativo novo em React Native com Expo, focado exclusivamente em gestão de estufas agrícolas. O sistema deve ser simples para o usuário final, mas completo, confiável e pronto para ser vendido como produto comercial.

O app não deve incluir Campo, Hidroponia ou múltiplos modos de produção nesta primeira versão.

Importante: o objetivo não é criar um protótipo, MVP incompleto ou app básico. O objetivo é criar uma primeira versão comercial enxuta, estável e profissional, com o fluxo principal completo do cadastro até a venda, recebimento, caixa e relatórios.

## Contexto do Produto

O aplicativo será usado por produtores de estufa para controlar:

- Cadastro de estufas.
- Plantios/ciclos ativos por estufa.
- Clientes.
- Vendas.
- Recebimentos.
- Cheques em mãos.
- Contas a receber.
- Caixa.
- Relatórios PDF/Excel.

O fluxo principal do usuário deve ser:

```text
Cadastrar conta → Criar estufa → Criar plantio → Registrar venda → Receber pagamento → Ver relatório
```

O app deve priorizar uso rápido no celular, com poucos campos obrigatórios e linguagem simples.

## Stack Técnica

Use:

- React Native.
- Expo.
- TypeScript.
- Supabase como backend.
- React Navigation ou Expo Router, escolhendo o mais adequado para simplicidade e manutenção.
- React Query/TanStack Query para cache e sincronização de dados.
- Zod para validação.
- Zustand ou Context API apenas quando fizer sentido.
- ESLint e TypeScript strict.

Evite:

- Complexidade prematura.
- Abstrações genéricas demais.
- Múltiplos modos de produção.
- Telas duplicadas.
- Lógica de negócio espalhada dentro de componentes.

## Princípios de Arquitetura

1. Separar regra de negócio da interface.
2. Manter telas simples e orientadas a fluxo.
3. Usar serviços para acesso ao Supabase.
4. Usar helpers puros para cálculos financeiros.
5. Criar testes para regras críticas.
6. Nunca misturar valor vendido com valor recebido.
7. Nunca considerar cheque em mãos como caixa recebido.
8. Permitir crescimento futuro sem reescrever a base.

## Estrutura de Pastas Sugerida

```text
src/
  app/
    navigation/
    providers/
  components/
    ui/
    forms/
    cards/
    feedback/
  features/
    auth/
    dashboard/
    estufas/
    plantios/
    clientes/
    vendas/
    recebimentos/
    caixa/
    relatorios/
    configuracoes/
  services/
    supabase/
    storage/
    pdf/
    excel/
  shared/
    constants/
    helpers/
    hooks/
    types/
    validation/
  tests/
```

## Padrão de Produto Comercial

O app deve nascer com padrão de produto vendável:

- Interface consistente e polida.
- Fluxo simples para funcionário comum usar sem treinamento técnico.
- Segurança por conta/empresa.
- Separação correta entre dados de usuários diferentes.
- Tratamento claro de erros.
- Estados de carregamento em todas as ações importantes.
- Confirmação antes de ações destrutivas.
- Relatórios confiáveis.
- Exportação PDF/Excel com layout profissional.
- Banco modelado para crescer sem retrabalho grande.
- Código organizado para manutenção por longo prazo.

## Arquitetura Profissional Esperada

O projeto deve seguir separação clara de responsabilidades:

- `features`: regras e telas por domínio.
- `services`: integração com Supabase, arquivos, PDF, Excel e armazenamento.
- `shared`: helpers, tipos, validações e constantes reutilizáveis.
- `components`: componentes visuais reutilizáveis.
- `tests`: testes de regras críticas.

Cada módulo deve conter:

- Telas.
- Componentes específicos.
- Hooks de dados.
- Schemas de validação.
- Serviços ou chamadas isoladas.
- Testes quando houver regra financeira ou cálculo.

Evite componentes gigantes e telas com regra de negócio misturada.

## Módulos da Versão Comercial 1.0

### 1. Autenticação

Funcionalidades:

- Login.
- Cadastro.
- Recuperação de senha.
- Sessão persistente.

Cadastro inicial deve ser simples, mas profissional. Pedir:

- Nome do produtor ou empresa.
- Nome do usuário.
- E-mail.
- Senha.

Após o cadastro, criar automaticamente:

- Uma conta/tenant.
- Uma estufa padrão chamada `Estufa 1`, se isso acelerar o primeiro uso.
- Configurações iniciais da conta.
- Perfil administrativo do usuário.

### 2. Onboarding

Após o primeiro login, o usuário deve ser guiado para deixar o sistema pronto:

1. Confirmar nome da empresa/produtor.
2. Confirmar ou criar a primeira estufa.
3. Criar o primeiro plantio.
4. Registrar uma venda de exemplo ou venda real.

O onboarding deve ser curto e pulável, mas deve orientar o usuário novo.

### 3. Dashboard

A tela inicial deve mostrar apenas o que importa no dia a dia:

- Vendas do mês.
- Valor recebido.
- Valor a receber.
- Cheques em mãos.
- Plantios ativos.

Ações rápidas:

- Nova venda.
- Novo plantio.
- Novo cliente.
- Receber pagamento.
- Ver contas a receber.
- Exportar relatório.

### 4. Estufas

Cadastro simples:

- Nome da estufa.
- Área em m² opcional.
- Observações opcionais.

Não exigir dados técnicos no primeiro momento, mas permitir evolução futura.

### 5. Plantios

Plantio deve representar um ciclo produtivo dentro de uma estufa.

Campos principais:

- Estufa.
- Cultura/produto.
- Variedade opcional.
- Data de início.
- Quantidade plantada opcional.
- Status: ativo, finalizado ou cancelado.

Evitar termos confusos. Na interface, usar `Produção em andamento` quando for mais claro que `Plantio ativo`.

### 6. Clientes

Cadastro simples:

- Nome.
- Telefone opcional.
- Documento opcional.
- Cidade opcional.
- Observações opcionais.

Venda deve permitir `Cliente avulso` sem obrigar cadastro.

### 7. Vendas

Esta é a tela mais importante do sistema.

A venda rápida deve pedir:

- Cliente ou cliente avulso.
- Plantio/produto.
- Quantidade.
- Unidade.
- Valor unitário ou valor total.
- Data da venda.
- Forma de pagamento.

Formas de pagamento:

- Dinheiro.
- Pix.
- Cartão.
- Cheque.
- Prazo.

Status financeiro:

- Pendente.
- Pago.
- Cancelado.

Regras:

- Valor vendido é o valor combinado da venda.
- Valor recebido é o valor que entrou de fato.
- Venda paga deve entrar no caixa.
- Venda pendente não deve entrar no caixa.
- Cheque em mãos não deve entrar no caixa.

Funcionalidades comerciais obrigatórias:

- Venda rápida.
- Venda detalhada.
- Histórico por cliente.
- Histórico por plantio.
- Filtro por período, cliente, status e forma de pagamento.
- Cancelamento controlado.
- Correção de recebimento com registro claro.
- Comprovante PDF da venda.

### 8. Recebimentos

Ao receber uma venda pendente, o usuário deve escolher:

- Valor recebido.
- Data real do recebimento.
- Forma de recebimento.
- Quem recebeu no caixa, se aplicável.

Para cheque, oferecer opções claras:

- `Cheque compensado agora`.
- `Cheque em mãos, destino a definir`.
- `Cheque com compensação futura`.

Regras:

- Cheque compensado entra no caixa.
- Cheque em mãos mantém a venda pendente e aparece separado nos relatórios.
- Cheque com compensação futura fica previsto até a data de compensação.

Funcionalidades comerciais obrigatórias:

- Recebimento total.
- Recebimento parcial, se tecnicamente viável.
- Correção de recebimento.
- Remoção de recebimento lançado errado.
- Registro de cheque em mãos.
- Registro de cheque previsto.
- Confirmação de compensação de cheque.

### 9. Caixa

O caixa deve mostrar somente valores confirmados.

Entradas:

- Vendas pagas.
- Cheques compensados.

Não entram no caixa:

- Vendas pendentes.
- Cheques em mãos.
- Cheques aguardando compensação.

Funcionalidades comerciais obrigatórias:

- Extrato do caixa.
- Resumo por período.
- Entradas confirmadas.
- Saídas confirmadas.
- Saldo confirmado.
- Separação de valores previstos.
- Exportação PDF.
- Exportação Excel.

### 10. Relatórios

Relatórios mínimos:

- Vendas por período.
- Contas a receber.
- Caixa.
- Extrato por cliente.
- Fechamento mensal.
- Vendas por produto.
- Vendas por cliente.
- Recebimentos por forma de pagamento.

Exportação:

- PDF.
- Excel.

Nos relatórios financeiros, separar:

- Valor vendido.
- Valor recebido.
- Valor pendente.
- Cheque em mãos.
- Cheque aguardando compensação.

Não expor dados internos no extrato do cliente, como:

- Para quem foi pago.
- Caixa interno.
- Local interno de recebimento.

### 11. Configurações

Funcionalidades:

- Dados da empresa/produtor.
- Preferências de tema.
- Preferências de unidade padrão.
- Gestão de usuários, se houver compartilhamento de conta.
- Backup/exportação administrativa.
- Informações da versão do app.

### 12. Auditoria e Segurança

Para um produto pronto para venda, ações críticas devem deixar rastreio:

- Venda criada.
- Venda editada.
- Venda cancelada.
- Recebimento registrado.
- Recebimento removido.
- Cheque compensado.
- Cliente alterado.

Não precisa mostrar tudo ao usuário comum, mas a base deve permitir suporte e investigação.

## Banco de Dados Sugerido

Começar enxuto, mas não básico. O banco deve estar preparado para uso comercial:

```text
tenants
users_profiles
estufas
plantios
clientes
vendas
venda_itens
recebimentos
caixa_movimentos
audit_logs
app_settings
```

### vendas

Campos sugeridos:

- id
- tenant_id
- cliente_id
- cliente_nome_avulso
- plantio_id
- data_venda
- valor_total
- status_pagamento
- observacoes
- created_at
- updated_at

### recebimentos

Campos sugeridos:

- id
- tenant_id
- venda_id
- valor
- data_recebimento
- metodo
- status
- destino
- observacoes
- created_at

Status de recebimento:

- confirmado
- cheque_em_maos
- cheque_previsto
- cancelado

### caixa_movimentos

Campos sugeridos:

- id
- tenant_id
- origem
- origem_id
- tipo
- valor
- data_caixa
- metodo
- descricao
- created_at

Regra importante:

Só criar `caixa_movimentos` quando o dinheiro realmente entrou ou saiu.

### audit_logs

Campos sugeridos:

- id
- tenant_id
- user_id
- entidade
- entidade_id
- acao
- descricao
- metadata
- created_at

Usar para rastrear ações críticas sem poluir as tabelas principais.

## UX Esperada

O app deve ser guiado por ações, não por módulos complexos.

Exemplo de botões principais:

- `Vender`.
- `Receber`.
- `Novo plantio`.
- `Ver caixa`.

Evitar botões como:

- `Conciliação`.
- `Compensação`.
- `Lançamento financeiro`.

Se um termo técnico for necessário, explicar na própria tela com texto curto.

## Experiência Pronta Para Venda

O app deve parecer produto final:

- Layout responsivo para celular.
- Textos claros em português.
- Ícones consistentes.
- Estados vazios bem explicados.
- Mensagens de erro úteis.
- Botões principais sempre evidentes.
- Nenhuma tela importante deve parecer teste ou rascunho.
- Nenhum fluxo principal deve depender de conhecimento técnico do usuário.

O produtor deve entender o que fazer olhando a tela.

## Regras de Qualidade

Obrigatório:

- TypeScript sem `any` desnecessário.
- Componentes pequenos.
- Serviços isolados.
- Helpers testáveis.
- Testes para cálculos financeiros.
- Tratamento claro de erro.
- Estados de loading nos botões.
- Confirmação antes de ações destrutivas.
- Logs/auditoria para ações financeiras.
- Testes para venda, recebimento, caixa e relatórios.
- Modelagem multiempresa/tenant desde o início.
- Regras de segurança no Supabase com RLS.
- Tratamento de sessão expirada.
- Compatibilidade com Android.
- Preparação para build de APK/AAB.

Não fazer:

- Não criar Campo.
- Não criar Hidroponia.
- Não criar módulos avançados antes do fluxo principal estar pronto.
- Não misturar relatório de cliente com dados internos do caixa.
- Não gerar migrations complexas sem necessidade.
- Não deixar fluxo crítico sem teste.
- Não usar nomes técnicos na interface quando existir termo simples.

## Entrega Esperada da Versão Comercial 1.0

Criar o projeto com:

- Estrutura de pastas.
- Navegação base.
- Tema visual.
- Autenticação.
- Onboarding inicial.
- Dashboard simples.
- Cadastro completo de estufas.
- Cadastro completo de clientes.
- Cadastro completo de plantios.
- Venda rápida funcional.
- Venda detalhada funcional.
- Recebimento funcional.
- Cheque em mãos.
- Cheque previsto.
- Compensação de cheque.
- Caixa funcional.
- Contas a receber funcional.
- Relatórios PDF/Excel profissionais.
- Extrato do cliente sem dados internos.
- Testes das regras financeiras.
- Build Android preparado.

## Checklist de Pronto Para Venda

Antes de considerar a versão vendável, validar:

- Usuário novo consegue começar sem suporte.
- Venda pode ser registrada em menos de 1 minuto.
- Recebimento pago entra corretamente no caixa.
- Venda pendente não entra no caixa.
- Cheque em mãos aparece separado e não entra no caixa.
- Cheque previsto não entra no saldo confirmado antes da compensação.
- Relatório PDF e Excel batem com os dados da tela.
- Extrato do cliente não mostra dados internos.
- Cancelamentos e correções não quebram o histórico.
- Dados de uma empresa não aparecem para outra.
- App não perde dados em erro de rede comum.
- APK/AAB pode ser gerado de forma reproduzível.

## Critério de Sucesso

Um produtor deve conseguir, em menos de 2 minutos:

1. Entrar no app.
2. Criar uma estufa.
3. Criar um plantio.
4. Registrar uma venda.
5. Marcar se recebeu ou se ficou pendente.
6. Ver essa venda no financeiro.

Além disso, o sistema deve estar confiável o suficiente para ser usado por cliente pagante em rotina real.

## Direção Final

Construa primeiro o fluxo principal funcionando muito bem, mas já com padrão comercial.

A prioridade não é ter muitas telas. A prioridade é que o produtor consiga vender, receber e conferir o dinheiro sem confusão.

Produto enxuto não significa produto básico. Significa produto completo no problema certo: gestão de estufa, venda, recebimento, caixa e relatório.
