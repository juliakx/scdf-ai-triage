import csv

INPUT_CSV = 'Clinics_Extracted_Clean.csv'
OUTPUT_SQL = 'import_clinics.sql'

print(f"Reading {INPUT_CSV}...")

with open(INPUT_CSV, 'r', encoding='utf-8') as f_in, open(OUTPUT_SQL, 'w', encoding='utf-8') as f_out:
    reader = csv.DictReader(f_in)

    f_out.write("DELETE FROM clinics;\n")

    count = 0
    for row in reader:
        clinic_type = row.get('Type', '').strip()

        # Only import Medical clinics (skip Dental, Aesthetics, etc.)
        if 'Medical' not in clinic_type:
            continue

        def clean(val):
            return str(val or '').strip().replace("'", "''")

        name = clean(row.get('Name', ''))
        address = clean(row.get('Address', ''))
        telephone = clean(row.get('Telephone', ''))
        ctype = clean(clinic_type)

        sql = f"INSERT INTO clinics (name, address, telephone, type) VALUES ('{name}', '{address}', '{telephone}', '{ctype}');\n"
        f_out.write(sql)
        count += 1

print(f"✅ Success! Generated {count} clinic SQL rows in '{OUTPUT_SQL}'")
