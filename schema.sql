DROP TABLE IF EXISTS patients;
CREATE TABLE patients (
    nric TEXT PRIMARY KEY,
    name TEXT,
    age INTEGER,
    sex TEXT,
    conditions TEXT,
    medications TEXT,
    allergies TEXT,
    last_visit TEXT
);

DROP TABLE IF EXISTS triage_rules;
CREATE TABLE triage_rules (
    id TEXT PRIMARY KEY,
    topic TEXT,
    category TEXT,
    destination TEXT,
    trigger_any TEXT,
    red_flags_any TEXT,
    immediate_actions TEXT,
    do_not TEXT,
    seek_care_soon_if TEXT
);