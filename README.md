# Estufa2

Base mobile em Expo/React Native para operacao agricola, financeiro, multi-tenant e suporte operacional.

## Setup

Requisitos minimos:
- Node.js 20+
- npm

Instalacao:

```bash
npm install
```

Se o PowerShell bloquear `npm.ps1`, use `npm.cmd` no terminal Windows:

```powershell
npm.cmd run test
```

## Comandos oficiais

```bash
npm run typecheck
npm run lint
npm run test
npm run validate
```

Formatacao:

```bash
npm run format
npm run format:check
```

## Validacao minima antes de PR

```bash
npm run validate
```

Checklist curto:
- `typecheck` verde
- `lint` verde
- `test` verde
- mudancas sensiveis acompanhadas de teste quando aplicavel

## Observacao sobre testes

A suite atual usa o runner nativo do Node:

```bash
node --test tests/*.test.ts
```

O script oficial permanece:

```bash
npm run test
```
