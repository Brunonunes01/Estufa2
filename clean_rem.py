import re
import traceback

try:
    def strip_file(path, replacements):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            for pattern, repl in replacements:
                content = re.sub(pattern, repl, content, flags=re.DOTALL)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception as e:
            print(f"Error processing {path}: {e}")

    # VendasListScreen
    strip_file('src/screens/Vendas/VendasListScreen.tsx', [
        (r"v\.originType === 'hydro_lote' \|\| v\.hydroLoteId\s*\?\s*'Hidroponia'\s*:", ""),
        (r"isHydroSale=\{item\.originType === 'hydro_lote' \|\| !!item\.hydroLoteId\}", "isHydroSale={false}"),
        (r"productionMode === 'hidroponia'\s*\?\s*'Hidroponia'\s*:", "")
    ])

    # ContasReceberScreen
    strip_file('src/screens/Financeiro/ContasReceberScreen.tsx', [
        (r"const isHydro =.*?!!\(item as any\)\.hydroLoteId;", "const isHydro = False;"),
        (r"if \(isHydro\) \{.*?\} else \{", "{",),
        (r"navigation\.navigate\('HidroponiaVendaForm', \{.*?\}\);", ""),
    ])

    # VendaItemCard
    strip_file('src/screens/Vendas/components/VendaItemCard.tsx', [
        (r"isHydroSale\s*\?\s*navigation\.navigate\('HidroponiaVendaForm', \{.*?\}\)\s*:", ""),
        (r"\{isHydroSale \? \([\s\S]*?HIDROPONIA[\s\S]*?\) : null\}", ""),
    ])

    # RelatoriosScreen
    strip_file('src/screens/Financeiro/RelatoriosScreen.tsx', [
        (r"\(venda as any\)\.originType === 'hydro_lote' \|\| \(venda as any\)\.hydroLoteId\s*\?\s*'Hidroponia'\s*:", ""),
        (r"hidden: settings\.activeProductionMode === 'hidroponia',", "hidden: false,"),
    ])

    # RelatorioOperacionalScreen
    strip_file('src/screens/Financeiro/RelatorioOperacionalScreen.tsx', [
        (r"\(venda as any\)\.originType === 'hydro_lote' \|\|.*?\|\|\s*\(venda as any\)\.hydroLoteId\s*\?\s*'Hidroponia'\s*:", ""),
    ])

    # financeProductionScope
    strip_file('src/services/financeProductionScope.ts', [
        (r"export const isHydroFinanceOrigin = \(venda: VendaScopeLike\) =>.*?return false;", ""),
        (r"if \(mode === 'hidroponia'\) return isHydroFinanceOrigin\(venda\);", ""),
        (r"if \(mode === 'hidroponia'\) return false;", ""),
        (r"if \(mode === 'hidroponia'\) return !despesa\.plantioId;", ""),
        (r"!isHydroFinanceOrigin\(venda\) &&", ""),
        (r"&& !isHydroFinanceOrigin\(venda\)", ""),
    ])

    # caixaServiceHelpers
    strip_file('src/services/caixaServiceHelpers.ts', [
        (r"if \(originType === 'hydro_lote' \|\| venda\?\.hydroLoteId\) return 'Hidroponia';", ""),
    ])
    
    # offlineStorageHandlers
    strip_file('src/services/offline/offlineStorageHandlers.ts', [
        (r"import \{.*?\} from '\.\./\.\./modules/hidroponia/services/hidroponiaColheitaService';\n?", ""),
    ])

    print('Cleanup complete')
except Exception as e:
    traceback.print_exc()
