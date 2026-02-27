DROP TABLE IF EXISTS patients;
CREATE TABLE patients (
    nric TEXT PRIMARY KEY,
    name TEXT,
    age INTEGER,
    sex TEXT,
    planning_area TEXT,
    address TEXT,
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

DROP TABLE IF EXISTS clinics;
CREATE TABLE clinics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    telephone TEXT,
    type TEXT,
    website TEXT,
    pap_test_services TEXT
);

DROP TABLE IF EXISTS pac_categories;
CREATE TABLE pac_categories (
    category TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    examples TEXT
);
