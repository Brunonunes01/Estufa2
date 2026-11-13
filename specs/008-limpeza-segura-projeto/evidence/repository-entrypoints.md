# Evidência: Entradas e consumidores do repositório

**Capturada em**: 2026-11-13
**Método**: inspeção de `index.ts`, `App.tsx`, `app.json`, `package.json`, configurações e scripts

## Aplicativo

- `index.ts` registra `App.tsx` com `registerRootComponent`.
- `App.tsx` compõe React Query, configurações, tema, feedback, autenticação e `RootNavigator`.
- `app.json` consome `assets/icon.png`, `assets/adaptive-icon.png` e `assets/splash-icon.png`; os três nomes são contratos de build Expo.
- `babel.config.js`, `metro.config.js`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json` e arquivos de ignore participam de compilação ou validação.

## Scripts declarados

- `npm start`, `android`, `ios` e `web` iniciam o Expo.
- `postinstall` executa `scripts/patch-supabase-hermes.cjs`.
- `lint`, `format`, `test`, `typecheck` e `validate` são gates de qualidade.
- `apk:local` executa `scripts/build-local-apk.ps1`; `apk:build` usa EAS.
- `support:portal` executa `support-portal/server.mjs`.
- Scripts Supabase iniciam/paralisam ambiente, aplicam schema e geram tipos, mas persistência é protegida nesta feature.

## Web e infraestrutura

- `Dockerfile` constrói o export web e usa `nginx.conf` para fallback de SPA.
- `support-portal/server.mjs` é uma entrada própria do portal e serve os demais arquivos em `support-portal/`.
- `eas.json` e `app.json` participam do build/publicação móvel.

## Operação manual conhecida

- `COMO_GERAR_APK_LOCAL.txt` documenta a mesma jornada encapsulada por `scripts/build-local-apk.ps1`; ambos têm finalidade operacional conhecida.
- `scripts/generate_aquisicao_pptx.js` não aparece em `package.json` nem em referências internas e grava em caminho absoluto fora do repositório. Permanece candidato de investigação até confirmação operacional.
- `clean.py`, `clean_dash.py`, `clean_list.py` e `clean_rem.py` não aparecem em scripts declarados nem em referências internas; eles editam código por expressões regulares e os padrões-alvo principais já não estão presentes. Permanecem candidatos, sujeitos à confirmação operacional.

## Resultado

Entradas e consumidores conhecidos foram mapeados. Arquivo sem import não é automaticamente órfão: configuração, extensão de plataforma, convenção e operação manual continuam sendo verificadas nas evidências específicas.
