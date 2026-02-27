import csv

INPUT_CSV = 'Clinics_Extracted_Clean.csv'
OUTPUT_SQL = 'import_clinics.sql'

print(f"Reading {INPUT_CSV}...")

with open(INPUT_CSV, 'r', encoding='utf-8-sig', newline='') as f_in, open(OUTPUT_SQL, 'w', encoding='utf-8') as f_out:
    reader = csv.DictReader(f_in)
    f_out.write("DELETE FROM clinics;\n")

    count = 0
    for row in reader:
        name = (row.get('Name') or '').strip().replace("'", "''")
        address = (row.get('Address') or '').strip().replace("'", "''")
        telephone = (row.get('Telephone') or '').strip().replace("'", "''")
        clinic_type = (row.get('Type') or '').strip().replace("'", "''")
        website = (row.get('Website') or '').strip().replace("'", "''")
        pap_test_services = (row.get('Pap Test Services') or '').strip().replace("'", "''")

        if not name or not address:
            continue

        sql = (
            "INSERT INTO clinics "
            "(name, address, telephone, type, website, pap_test_services) "
            f"VALUES ('{name}', '{address}', '{telephone}', '{clinic_type}', '{website}', '{pap_test_services}');\n"
        )
        f_out.write(sql)
        count += 1

print(f"Success! Generated {count} SQL commands in '{OUTPUT_SQL}'")
