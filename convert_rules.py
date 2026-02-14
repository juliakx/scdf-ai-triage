import csv
import os

# CONFIGURATION
INPUT_CSV = 'scdf_relevant_triage_dataset_master.csv'
OUTPUT_SQL = 'import_rules.sql'

# Verify CSV exists
if not os.path.exists(INPUT_CSV):
    print(f"❌ Error: Could not find '{INPUT_CSV}' in this folder.")
    print("   Please move your CSV file into this 'triage-backend' folder.")
    exit(1)

print(f"Reading {INPUT_CSV}...")

with open(INPUT_CSV, 'r', encoding='utf-8-sig') as f_in, open(OUTPUT_SQL, 'w', encoding='utf-8') as f_out:
    reader = csv.DictReader(f_in)
    
    # Clean the table first
    f_out.write("DELETE FROM triage_rules;\n")
    
    count = 0
    for row in reader:
        # Helper to escape single quotes for SQL (e.g. "don't" -> "don''t")
        def clean(key):
            val = row.get(key, '')
            if val is None: return ''
            return val.strip().replace("'", "''")

        sql = f"""
INSERT INTO triage_rules (id, topic, category, destination, trigger_any, red_flags_any, immediate_actions, do_not, seek_care_soon_if)
VALUES ('{clean('id')}', '{clean('topic')}', '{clean('category')}', '{clean('destination')}', '{clean('trigger_any')}', '{clean('red_flags_any')}', '{clean('immediate_actions')}', '{clean('do_not')}', '{clean('seek_care_soon_if')}');
"""
        f_out.write(sql.strip() + "\n")
        count += 1

print(f"✅ Success! Generated {count} rules in '{OUTPUT_SQL}'")