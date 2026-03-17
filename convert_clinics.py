import csv

# Read the CSV file with UTF-8 BOM handling
with open('Clinics_Extracted_Clean.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Generate SQL with proper names
sql_lines = ["DELETE FROM clinics;"]

for row in rows:
    name = row['Name'].replace("'", "''")  # Escape single quotes
    address = row['Address'].replace("'", "''")
    telephone = row['Telephone'].replace("'", "''")
    clinic_type = row['Type'].replace("'", "''")
    
    sql = f"INSERT INTO clinics (name, address, telephone, type) VALUES ('{name}', '{address}', '{telephone}', '{clinic_type}');"
    sql_lines.append(sql)

# Write to import_clinics.sql
with open('import_clinics.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f"Generated import_clinics.sql with {len(rows)} clinics")
print("First clinic:", rows[0]['Name'], rows[0]['Address'][:50])
