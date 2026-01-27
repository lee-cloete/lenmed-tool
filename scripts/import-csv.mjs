import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function importCSV() {
  console.log('🔄 Reading CSV file...')

  const csvContent = readFileSync('./flume_expanded.csv', 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })

  console.log(`📊 Found ${records.length} records in CSV\n`)

  // Extract unique hospitals
  const hospitalNames = [...new Set(records.map(r => r['Hospital Name']).filter(Boolean))]
  console.log(`🏥 Found ${hospitalNames.length} unique hospitals`)

  // Extract unique doctors (by permalink to handle duplicates across hospitals)
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
  console.log(`👨‍⚕️ Found ${doctorMap.size} unique doctors\n`)

  // Insert hospitals
  console.log('📥 Inserting hospitals...')
  const hospitalIdMap = new Map()
  const hospitalsToInsert = hospitalNames.map(name => ({ name }))

  // Insert all hospitals at once
  const { data: insertedHospitals, error: hospError } = await supabase
    .from('hospitals')
    .insert(hospitalsToInsert)
    .select('id, name')

  if (hospError) {
    console.log('   Note:', hospError.message)
    // If insert fails (e.g., duplicates), fetch all hospitals
    const { data: allHospitals } = await supabase
      .from('hospitals')
      .select('id, name')

    if (allHospitals) {
      allHospitals.forEach(h => hospitalIdMap.set(h.name, h.id))
    }
  } else if (insertedHospitals) {
    insertedHospitals.forEach(h => hospitalIdMap.set(h.name, h.id))
  }

  // If we still don't have all hospitals, fetch them
  if (hospitalIdMap.size < hospitalNames.length) {
    const { data: allHospitals } = await supabase
      .from('hospitals')
      .select('id, name')

    if (allHospitals) {
      allHospitals.forEach(h => hospitalIdMap.set(h.name, h.id))
    }
  }

  console.log(`   ✅ ${hospitalIdMap.size} hospitals ready\n`)

  // Insert doctors in batches
  console.log('📥 Inserting doctors...')
  const doctorIdMap = new Map()
  const doctorsArray = Array.from(doctorMap.entries())

  // Insert in batches of 50
  const batchSize = 50
  for (let i = 0; i < doctorsArray.length; i += batchSize) {
    const batch = doctorsArray.slice(i, i + batchSize)
    const doctorsToInsert = batch.map(([, doc]) => doc)

    const { data: insertedDocs, error: docError } = await supabase
      .from('doctors')
      .insert(doctorsToInsert)
      .select('id, permalink')

    if (docError) {
      // Batch insert failed, try one by one
      for (const [permalink, doctor] of batch) {
        const { data: singleDoc, error: singleErr } = await supabase
          .from('doctors')
          .insert(doctor)
          .select('id, permalink')
          .single()

        if (singleDoc) {
          doctorIdMap.set(permalink, singleDoc.id)
        } else if (singleErr) {
          // Try to fetch existing
          const { data: existing } = await supabase
            .from('doctors')
            .select('id, permalink')
            .eq('permalink', permalink)
            .single()

          if (existing) {
            doctorIdMap.set(permalink, existing.id)
          }
        }
      }
    } else if (insertedDocs) {
      insertedDocs.forEach(d => doctorIdMap.set(d.permalink, d.id))
    }

    process.stdout.write(`\r   Progress: ${Math.min(i + batchSize, doctorsArray.length)}/${doctorsArray.length}`)
  }

  // If we don't have all doctors, fetch them all
  if (doctorIdMap.size < doctorMap.size) {
    const { data: allDoctors } = await supabase
      .from('doctors')
      .select('id, permalink')

    if (allDoctors) {
      allDoctors.forEach(d => {
        if (d.permalink) doctorIdMap.set(d.permalink, d.id)
      })
    }
  }

  console.log(`\n   ✅ ${doctorIdMap.size} doctors ready\n`)

  // Create relationships
  console.log('🔗 Creating doctor-hospital relationships...')
  const relationships = []

  for (const record of records) {
    const hospitalName = record['Hospital Name']
    const permalink = record['Permalink']

    const hospitalId = hospitalIdMap.get(hospitalName)
    const doctorId = doctorIdMap.get(permalink)

    if (hospitalId && doctorId) {
      const key = `${doctorId}-${hospitalId}`
      if (!relationships.find(r => r.doctor_id === doctorId && r.hospital_id === hospitalId)) {
        relationships.push({ doctor_id: doctorId, hospital_id: hospitalId })
      }
    }
  }

  // Insert relationships in batches
  let relationshipCount = 0
  for (let i = 0; i < relationships.length; i += batchSize) {
    const batch = relationships.slice(i, i + batchSize)

    const { data, error } = await supabase
      .from('doctor_hospitals')
      .insert(batch)
      .select()

    if (data) {
      relationshipCount += data.length
    } else if (error && !error.message.includes('duplicate')) {
      // Try one by one for non-duplicate errors
      for (const rel of batch) {
        const { data: single } = await supabase
          .from('doctor_hospitals')
          .insert(rel)
          .select()

        if (single) relationshipCount++
      }
    }

    process.stdout.write(`\r   Progress: ${Math.min(i + batchSize, relationships.length)}/${relationships.length}`)
  }

  console.log(`\n   ✅ ${relationshipCount} relationships created\n`)

  console.log('═══════════════════════════════════════')
  console.log('✅ IMPORT COMPLETE!')
  console.log('═══════════════════════════════════════')
  console.log(`   🏥 Hospitals:     ${hospitalIdMap.size}`)
  console.log(`   👨‍⚕️ Doctors:       ${doctorIdMap.size}`)
  console.log(`   🔗 Relationships: ${relationshipCount}`)
  console.log('═══════════════════════════════════════')
}

importCSV().catch(err => {
  console.error('\n❌ Import failed:', err.message)
  process.exit(1)
})
