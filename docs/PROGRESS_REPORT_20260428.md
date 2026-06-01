# Relatório de Evolução e Estado do Projeto - Estufa2
**Data:** 28 de Abril de 2026

Este documento serve como bússola para a continuidade do desenvolvimento, detalhando as mudanças estruturais e as decisões de negócio tomadas hoje.

---

## 1. Profissionalização da Arquitetura (Backend & DX)

### rotinas server-side antigas & Integridade
- **Estratégia de Resumo (Dashboard):** Implementamos gatilhos (`onDocumentWritten`) em `vendas`, `despesas`, `tarefas`, `plantios` e `colheitas`. Agora, o Supabase recalcula automaticamente os totais financeiros e operacionais no documento `dashboard_summary/{tenantId}`.
- **Validação com Zod:** Criamos schemas em `rotinas antigas/src/schemas.ts` para garantir que dados corrompidos ou negativos não entrem nos cálculos do dashboard.
- **Logs Profissionais:** Adicionamos `supabase-rotinas antigas/logger` para auditoria de erros e validações.

### Testes e Padrões
- **Testes Automatizados:** Configuramos Jest e criamos testes unitários para a lógica financeira e schemas de validação em `rotinas antigas/src/__tests__`.
- **Ambiente de Funções:** Regularizamos a pasta `rotinas antigas` com `package.json`, `tsconfig.json` e `jest.config.js`.
- **Diretrizes de Frontend:** Criamos o arquivo `docs/FRONTEND_GUIDELINES.md` que define as responsabilidades de qualquer IA ou desenvolvedor que atue no projeto (Isolamento de lógica, Multi-tenancy e fidelidade visual).

---

## 2. O Novo Modelo de Hidroponia (Pivot de Domínio)

### Redefinição de "Lote Hidropônico"
O conceito foi simplificado para ser 100% natural ao produtor rural:
- **Lote Fixo:** O Lote agora é apenas um **Identificador**. Ele possui: `id`, `codigoLote` (único e imutável), `nomeOperacional` e vínculo com a `estufaId`.
- **Remoção de Gordura:** Eliminamos campos de cultura, variedade, fase, quantidades e saldos do documento do Lote. O Lote não "cresce", ele apenas "agrupa".

### Ocupação da Bancada (A Autoridade Real)
Toda a dinâmica da hidroponia foi movida para a **Ocupação (`HydroOcupacao`)**:
- É na bancada/canal que definimos: **Cultura**, **Variedade**, **Quantidade de Mudas**, **Fase (Berçário/Final)** e **Data de Início**.
- Um único Lote pode estar espalhado em 10 bancadas diferentes com detalhes distintos.

---

## 3. Evolução das Telas e UI

### Detalhes do Lote (`HidroponiaLoteDetailScreen`)
- Transformada em **Painel de Controle**.
- Exibe a lista de **Bancadas em Produção** vinculadas ao lote.
- Adicionados dois comandos principais:
    1. **"Iniciar Produção" (Verde):** Abre o formulário para ocupar uma nova bancada física.
    2. **"Configurar Bancadas" (Azul):** Abre a gestão da estrutura física da estufa.

### Gestão de Layout (`HidroponiaEstufaLayoutScreen`)
- **Construção Manual:** Removemos layouts prontos. O usuário agora cria seus setores e bancadas do zero.
- **CRUD Completo:** Implementada a função de **Editar** e **Excluir** bancadas e setores diretamente no grid visual.
- **Inteligência Visual:** Bancadas mostram o nome da **Cultura** em destaque e uma barra de progresso baseada na ocupação da capacidade.

### Adicionar à Bancada (`HidroponiaMovimentarLoteScreen`)
- Reestruturada em passos numerados:
    1. Escolha do local físico.
    2. Definição da biologia (Cultura, Mudas, Fase).
    3. Registro de responsabilidade.

---

## 4. Correções Técnicas Importantes
- **Indices do Supabase:** Implementamos uma estratégia de "Filtro em Memória" no `hidroponiaOcupacaoService.ts` para evitar erros de query por falta de índices compostos no Supabase.
- **Segurança:** Garantimos que todos os registros de hidroponia incluam `userId` além do `tenantId` para bater com as regras de segurança existentes.
- **Build:** Corrigimos erros de sintaxe (identificadores duplicados) nas telas de detalhe.

---

## 5. Estado Atual e Próximos Passos
O sistema está estável, profissional e seguindo a lógica de **"Lote Fixo -> Bancada Dinâmica"**.

**Sugestão de continuidade:**
1. Implementar a tela de **Venda/Colheita** partindo diretamente da bancada ocupada no Layout.
2. Adicionar leitura de Sensores (Solução Nutritiva) vinculada ao setor da estufa.
3. Gerar QR Codes para as bancadas baseados no `codigoLote` + ID da bancada.
