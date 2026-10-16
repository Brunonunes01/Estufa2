import re
import traceback

try:
    def clean_detail(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = re.sub(r"const isHydroMode = settings\.activeProductionMode === 'hidroponia';\n?", "", content)
        content = re.sub(r"const quickActions = isHydroMode.*?\] : \[", "const quickActions = [", content, flags=re.DOTALL)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    def clean_form(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        content = re.sub(r"import \{ HydroponicSystemType, ProductionMode \} from '\.\./\.\./types/domain';\n?", "", content)
        content = re.sub(r"import \{ ProductionMode \} from '\.\./\.\./types/domain';\n?", "", content)
        content = re.sub(r"import \{ HYDRO_SYSTEM_OPTIONS \} from '\.\./\.\./modules/hidroponia/constants';\n?", "", content)
        content = re.sub(r"const isHydroMode = settings\.activeProductionMode === 'hidroponia';\n?", "", content)
        content = re.sub(r"const \[isHydroponic, setIsHydroponic\] = useState\(isHydroMode\);\n?", "", content)
        content = re.sub(r"const \[hydroponicSystemType, setHydroponicSystemType\] = useState<HydroponicSystemType>\('nft'\);\n?", "", content)
        content = re.sub(r"setIsHydroponic\(!!data\.productionModes\?\.includes\('hydroponics'\) \|\| data\.tipo === 'hidroponia'\);\n?", "", content)
        content = re.sub(r"setHydroponicSystemType\(data\.hydroponicSystemType \|\| 'nft'\);\n?", "", content)
        content = re.sub(r"const persistAsHydroponic = isEditMode \? isHydroponic : isHydroMode;\n?", "", content)
        content = re.sub(r"const productionModes: ProductionMode\[\] = persistAsHydroponic \? \['hydroponics'\] : \['long_cycle'\];\n?", "const productionModes = ['long_cycle'];\n", content)
        content = re.sub(r"tipo: persistAsHydroponic \? 'hidroponia' : 'solo',", "tipo: 'solo',", content)
        content = re.sub(r"hydroponicSystemType: persistAsHydroponic \? hydroponicSystemType : null,", "", content)
        content = re.sub(r"\{isHydroMode\s*\?\s*'Cadastro no modo Hidroponia \(esta estufa aparecerá só em Hidroponia\)\.'\s*:\s*'Cadastro.*?'\}", "'Cadastro de Estufa (Modo solo/ciclo longo).'", content, flags=re.DOTALL)
        content = re.sub(r"\{\(isHydroMode \|\| isHydroponic\).*?\)\}", "", content, flags=re.DOTALL)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    clean_detail('src/screens/Estufas/EstufaDetailScreen.tsx')
    clean_form('src/screens/Estufas/EstufaFormScreen.tsx')
    print('Done')
except Exception as e:
    traceback.print_exc()
