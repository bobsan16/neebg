import json
import os
import pandas as pd

# ==================== НАСТРОЙКИ ====================
# Името на вашия оригинален Excel файл от МОН/Портала за данни
EXCEL_FILE_NAME = "maturi_data.xlsx"

# Имената на колоните във ВАШИЯ Excel файл. 
# Променете текстовете в кавичките вдясно, ако в Excel се казват по друг начин!
COL_YEAR = "Година"
COL_MUNICIPALITY = "Община"
COL_BEL = "БЕЛ"
COL_STUDENTS_BEL = "БЕЛ-Явили"
COL_MATH = "Математика"
COL_STUDENTS_MATH = "Математика-Явили"

# Името на изходния файл, който ще отиде в GitHub
OUTPUT_JSON_NAME = "data.json"
# ===================================================

def convert_excel_to_nested_json():
    # Проверка дали файлът съществува в текущата папка
    if not os.path.exists(EXCEL_FILE_NAME):
        print(f"❌ Грешка: Файлът '{EXCEL_FILE_NAME}' не беше намерен в тази папка.")
        print("Моля, поставете Excel файла в същата директория, където е този скрипт, или коригирайте името му в настройките.")
        return

    print(f"⏳ Зареждане и обработка на '{EXCEL_FILE_NAME}'...")
    
    try:
        # Четем Excel файла
        df = pd.read_excel(EXCEL_FILE_NAME)
        
        # Премахваме празни редове, ако има такива в ключовите колони
        df = df.dropna(subset=[COL_YEAR, COL_MUNICIPALITY])
        
        nested_dict = {}

        # 1. Групиране на данните по Година
        for year, group in df.groupby(COL_YEAR):
            # Поправка: Превръщаме в текст директно и махаме ".0" накрая, ако Excel го е прочел като число
            year_key = str(year).strip()
            if year_key.endswith('.0'):
                year_key = year_key[:-2]
                
            nested_dict[year_key] = {}
            
            # 2. Обхождане на всеки ред за съответната година
            for _, row in group.iterrows():
                # Вземаме името на общината и изчистваме излишни интервали
                mun_name = str(row[COL_MUNICIPALITY]).strip()
                
                # Защита срещу празни или грешни стойности в оценките/учениците
                try:
                    bel_score = round(float(row[COL_BEL]), 2) if pd.notna(row[COL_BEL]) else 0.0
                    mat_score = round(float(row[COL_MATH]), 2) if pd.notna(row[COL_MATH]) else 0.0
                    students_bel = int(row[COL_STUDENTS_BEL]) if pd.notna(row[COL_STUDENTS_BEL]) else 0
                    students_math = int(row[COL_STUDENTS_MATH]) if pd.notna(row[COL_STUDENTS_MATH]) else 0
                except (ValueError, TypeError):
                    # Ако има текст вместо число (напр. "няма данни" или "-"), записва 0
                    bel_score, mat_score, students_bel, students_math = 0.0, 0.0, 0, 0

                # Добавяме общината в структурата за съответната година
                nested_dict[year_key][mun_name] = {
                    "bel_score": bel_score,
                    "mat_score": mat_score,
                    "students_bel": students_bel,
                    "students_math": students_math
                }

        # 3. Записване в JSON файл с UTF-8 кодиране за поддръжка на Кирилица
        with open(OUTPUT_JSON_NAME, "w", encoding="utf-8") as f:
            # ensure_ascii=False гарантира, че имената на общините ще са на кирилица, а не \u0411...
            json.dump(nested_dict, f, ensure_ascii=False, indent=2)

        print(f"✅ Успех! Файлът '{OUTPUT_JSON_NAME}' е генериран успешно и е готов за GitHub Pages.")
        
    except Exception as e:
        print(f"❌ Възникна неочаквана грешка при обработката: {e}")

if __name__ == "__main__":
    convert_excel_to_nested_json()