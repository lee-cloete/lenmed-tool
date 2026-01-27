import { parse } from 'csv-parse/sync'
import { readFileSync, writeFileSync } from 'fs'

console.log('Reading CSV file...')

const csvContent = readFileSync('./flume_expanded.csv', 'utf-8')
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true
})

console.log(`Found ${records.length} records`)

// Extract unique hospitals
const hospitalNames = [...new Set(records.map(r => r['Hospital Name']).filter(Boolean))]
console.log(`Found ${hospitalNames.length} unique hospitals`)

// Extract unique doctors
const doctorMap = new Map()
for (const record of records) {
  const permalink = record['Permalink']
  if (permalink && !doctorMap.has(permalink)) {
    doctorMap.set(permalink, {
      title: record['Title'] || '',
      full_name: record['Dr Full Name'] || record['Title'] || '',
      disciplines: record['Doctors Disciplines'] || '',
      phone1: record['wpcf-doctor-telephone'] || '',
      phone2: record['wpcf-doctor-telephone-2'] || '',
      phone3: record['wpcf-doctor-telephone-3'] || '',
      email: record['wpcf-contact-email'] || '',
      bio_link: record['wpcf-display-bio-link'] === '1.0' || record['wpcf-display-bio-link'] === '1',
      permalink: permalink,
      status: record['Status'] || 'publish'
    })
  }
}
console.log(`Found ${doctorMap.size} unique doctors`)

// Helper to escape SQL strings
const esc = (str) => {
  if (!str) return 'NULL'
  return `'${str.replace(/'/g, "''")}'`
}

let sql = `-- Lenmed Data Import
-- Generated from flume_expanded.csv
-- Run this in Supabase SQL Editor

-- Insert Hospitals
INSERT INTO hospitals (name) VALUES
${hospitalNames.map(name => `(${esc(name)})`).join(',\n')}
ON CONFLICT DO NOTHING;

-- Insert Doctors
INSERT INTO doctors (title, full_name, disciplines, phone1, phone2, phone3, email, bio_link, permalink, status) VALUES
`

const doctorValues = []
for (const [, doc] of doctorMap) {
  doctorValues.push(`(${esc(doc.title)}, ${esc(doc.full_name)}, ${esc(doc.disciplines)}, ${esc(doc.phone1)}, ${esc(doc.phone2)}, ${esc(doc.phone3)}, ${esc(doc.email)}, ${doc.bio_link}, ${esc(doc.permalink)}, ${esc(doc.status)})`)
}
sql += doctorValues.join(',\n')
sql += '\nON CONFLICT DO NOTHING;\n\n'

// Generate relationship inserts
sql += `-- Insert Doctor-Hospital Relationships
INSERT INTO doctor_hospitals (doctor_id, hospital_id)
SELECT d.id, h.id
FROM (VALUES
`

const relationshipValues = []
const seenRelations = new Set()

for (const record of records) {
  const hospitalName = record['Hospital Name']
  const permalink = record['Permalink']
  const key = `${permalink}|${hospitalName}`

  if (hospitalName && permalink && !seenRelations.has(key)) {
    seenRelations.add(key)
    relationshipValues.push(`(${esc(permalink)}, ${esc(hospitalName)})`)
  }
}

sql += relationshipValues.join(',\n')
sql += `
) AS v(permalink, hospital_name)
JOIN doctors d ON d.permalink = v.permalink
JOIN hospitals h ON h.name = v.hospital_name
ON CONFLICT DO NOTHING;

-- Show counts
SELECT 'Hospitals' as table_name, COUNT(*) as count FROM hospitals
UNION ALL
SELECT 'Doctors', COUNT(*) FROM doctors
UNION ALL
SELECT 'Relationships', COUNT(*) FROM doctor_hospitals;
`

writeFileSync('./scripts/import-data.sql', sql)
console.log('\n✅ SQL file generated: scripts/import-data.sql')
console.log('   Copy and paste this into Supabase SQL Editor to import data')
