import re
import traceback

try:
    def clean_dashboard(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        content = re.sub(r"const isHydroMode = settings\.activeProductionMode === 'hidroponia';\n?", "", content)
        content = re.sub(r"if \(isHydroMode\) \{[\s\S]*?\} else if", "if", content)
        content = re.sub(r"isHydroMode,\s*", "", content)
        content = re.sub(r"isHydroMode \? 'water-outline' : ", "", content)
        content = re.sub(r"isHydroMode\s*\?\s*'Hidroponia'\s*:", "", content)

        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    clean_dashboard('src/screens/Dashboard/DashboardScreen.tsx')
    print('Done')
except Exception as e:
    traceback.print_exc()
