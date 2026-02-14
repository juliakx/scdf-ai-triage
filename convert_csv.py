import csv

# Files
INPUT_CSV = 'patients.csv'
OUTPUT_SQL = 'import_data.sql'

print(f"Reading {INPUT_CSV}...")

with open(INPUT_CSV, 'r', encoding='utf-8') as f_in, open(OUTPUT_SQL, 'w', encoding='utf-8') as f_out:
    # 1. Read CSV
    reader = csv.DictReader(f_in)
    
    # 2. Write SQL Header (Clear old data first to avoid duplicates)
    f_out.write("DELETE FROM patients;\n")
    
    count = 0
    for row in reader:
        # 3. Extract & Clean Data
        # We combine First/Last name into one 'name' field to match your schema
        nric = row['patient_nric'].strip()
        name = f"{row['patient_first_name']} {row['patient_last_name']}".replace("'", "''") # Escape single quotes
        age = row['age']
        sex = row['sex']
        
        # Clean up the JSON-like strings for SQL
        conditions = row['conditions'].replace("'", "''")
        medications = row['medications'].replace("'", "''")
        allergies = row['allergies'].replace("'", "''")
        last_visit = row['last_visit_date']

        # 4. Generate INSERT statement
        sql = f"INSERT INTO patients (nric, name, age, sex, conditions, medications, allergies, last_visit) VALUES ('{nric}', '{name}', {age}, '{sex}', '{conditions}', '{medications}', '{allergies}', '{last_visit}');\n"
        
        f_out.write(sql)
        count += 1

print(f"✅ Success! Generated {count} SQL commands in '{OUTPUT_SQL}'")
