import csv

INPUT_CSV = 'PAC_Cleaned_Data.csv'
OUTPUT_SQL = 'import_pac.sql'

print(f"Reading {INPUT_CSV}...")

with open(INPUT_CSV, 'r', encoding='utf-8-sig', newline='') as f_in, open(OUTPUT_SQL, 'w', encoding='utf-8') as f_out:
    reader = csv.DictReader(f_in)
    f_out.write('DELETE FROM pac_categories;\n')

    count = 0
    for row in reader:
        category = (row.get('Category') or '').strip().replace("'", "''")
        title = (row.get('Title') or '').strip().replace("'", "''")
        description = (row.get('Description') or '').strip().replace("'", "''")
        examples = (row.get('Examples') or '').strip().replace("'", "''")

        if not category:
            continue

        sql = (
            "INSERT INTO pac_categories (category, title, description, examples) "
            f"VALUES ('{category}', '{title}', '{description}', '{examples}');\n"
        )
        f_out.write(sql)
        count += 1

print(f"Success! Generated {count} SQL commands in '{OUTPUT_SQL}'")
