import re
import traceback

try:
    def clean_list(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        content = re.sub(r"const isHydroMode = settings\.activeProductionMode === 'hidroponia';\n?", "", content)
        content = re.sub(r"const isHydroponicEstufa =.*?return isHydroMode \? isHydroponicEstufa : !isHydroponicEstufa;", "return true;", content, flags=re.DOTALL)
        content = re.sub(r"\[estufasRaw, isHydroMode\]", "[estufasRaw]", content)
        content = re.sub(r"if \(isHydroMode\) \{[\s\S]*?\} else \{", "", content)
        content = re.sub(r"\[activePlantioByEstufa, navigation, showWarning, isHydroMode\]", "[activePlantioByEstufa, navigation, showWarning]", content)
        content = re.sub(r"if \(mode === 'hidro_layout'\) \{[\s\S]*?return;\n\s*\}", "", content)
        content = re.sub(r": mode === 'hidro_layout'\s*\?\s*'Escolha a estufa para layout'", "", content)
        content = re.sub(r": mode === 'hidro_layout'\s*\?\s*'Selecione a estufa para abrir movimentação e ocupação de bancadas\.'\s*: isHydroMode\s*\?\s*'Monitore as estufas hidropônicas e acesse layout/produção com um toque\.'\s*:\s*'Monitore status, ciclo e venda por unidade com um toque\.'", ": 'Monitore status, ciclo e venda por unidade com um toque.'", content)
        content = re.sub(r"\{isHydroMode \? 'Operação hidropônica' : plantioAtivo \? `Ciclo ativo: \$\{plantioAtivo\.cultura\}` : 'Sem ciclo ativo'\}", "{plantioAtivo ? `Ciclo ativo: ${plantioAtivo.cultura}` : 'Sem ciclo ativo'}", content)
        content = re.sub(r"\{isHydroMode \? \(.*?\)\s*:\s*\(", "{ (", content, flags=re.DOTALL)
        content = re.sub(r"isHydroMode \? 'water' : 'basket-plus'", "'basket-plus'", content)
        content = re.sub(r"isHydroMode \? 'Hidroponia' : 'Vender'", "'Vender'", content)

        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    clean_list('src/screens/Estufas/EstufasListScreen.tsx')
    print('Done')
except Exception as e:
    traceback.print_exc()
