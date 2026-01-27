import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://yjphsjjqrgzntfirwogh.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_KEY is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetStatusColumn() {
  console.log('Resetting status column to null for all doctors...')

  const { error } = await supabase
    .from('doctors')
    .update({ status: null })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Match all rows

  if (error) {
    console.error('Error resetting status:', error)
  } else {
    console.log('Status column reset successfully!')
  }
}

async function findDuplicates() {
  console.log('\nFinding duplicate doctors...')

  const { data: doctors, error } = await supabase
    .from('doctors')
    .select('id, full_name, title, email')
    .order('full_name')

  if (error) {
    console.error('Error fetching doctors:', error)
    return []
  }

  // Group by full_name to find duplicates
  const nameGroups: Record<string, typeof doctors> = {}

  for (const doctor of doctors || []) {
    const key = doctor.full_name?.toLowerCase().trim() || ''
    if (!nameGroups[key]) {
      nameGroups[key] = []
    }
    nameGroups[key].push(doctor)
  }

  // Find groups with more than one doctor (duplicates)
  const duplicates = Object.entries(nameGroups)
    .filter(([_, docs]) => docs.length > 1)
    .map(([name, docs]) => ({ name, count: docs.length, doctors: docs }))

  console.log(`Found ${duplicates.length} duplicate name groups:`)
  duplicates.forEach(dup => {
    console.log(`  - "${dup.name}" appears ${dup.count} times`)
  })

  return duplicates
}

async function removeDuplicates() {
  console.log('\nRemoving duplicate doctors (keeping first entry)...')

  const { data: doctors, error } = await supabase
    .from('doctors')
    .select('id, full_name, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching doctors:', error)
    return
  }

  // Track seen names and IDs to delete
  const seenNames = new Set<string>()
  const idsToDelete: string[] = []

  for (const doctor of doctors || []) {
    const key = doctor.full_name?.toLowerCase().trim() || ''
    if (seenNames.has(key)) {
      idsToDelete.push(doctor.id)
    } else {
      seenNames.add(key)
    }
  }

  if (idsToDelete.length === 0) {
    console.log('No duplicates to remove!')
    return
  }

  console.log(`Removing ${idsToDelete.length} duplicate entries...`)

  const { error: deleteError } = await supabase
    .from('doctors')
    .delete()
    .in('id', idsToDelete)

  if (deleteError) {
    console.error('Error deleting duplicates:', deleteError)
  } else {
    console.log(`Successfully removed ${idsToDelete.length} duplicate doctors!`)
  }
}

async function showStats() {
  const { count } = await supabase
    .from('doctors')
    .select('*', { count: 'exact', head: true })

  console.log(`\nTotal doctors in database: ${count}`)
}

async function main() {
  const command = process.argv[2]

  console.log('Lenmed Database Management Script')
  console.log('==================================\n')

  switch (command) {
    case 'reset-status':
      await resetStatusColumn()
      break
    case 'find-duplicates':
      await findDuplicates()
      break
    case 'remove-duplicates':
      await findDuplicates()
      await removeDuplicates()
      break
    case 'all':
      await showStats()
      await findDuplicates()
      await removeDuplicates()
      await resetStatusColumn()
      await showStats()
      break
    default:
      console.log('Usage: npx tsx scripts/manage-db.ts <command>')
      console.log('')
      console.log('Commands:')
      console.log('  reset-status     - Reset all status values to null')
      console.log('  find-duplicates  - Show duplicate doctor names')
      console.log('  remove-duplicates - Remove duplicate doctors (keeps oldest)')
      console.log('  all              - Run all cleanup operations')
  }
}

main().catch(console.error)
