<script setup lang="ts">
import { Plus, Trash2, X, Users, Building2, RefreshCw, History, Clock, User } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

interface Doctor {
  id: string
  title: string
  full_name: string
  disciplines: string
}

interface Hospital {
  id: string
  name: string
  city: string
}

interface Relationship {
  id: string
  doctor_id: string
  hospital_id: string
  doctors: Doctor
  hospitals: Hospital
  status: string | null
  created_at: string | null
  created_by: string | null
  updated_at: string | null
  updated_by: string | null
}

interface RelationshipHistory {
  id: string
  doctor_id: string
  action: string
  old_hospital_name: string | null
  new_hospital_name: string | null
  changed_by: string
  changed_at: string
}

const relationships = ref<Relationship[]>([])
const doctors = ref<Doctor[]>([])
const hospitals = ref<Hospital[]>([])
const loading = ref(true)
const showModal = ref(false)
const showTransferModal = ref(false)
const selectedDoctor = ref('')
const selectedHospital = ref('')
const transferRelationship = ref<Relationship | null>(null)
const newHospitalId = ref('')
const viewMode = ref<'list' | 'visual'>('list')
const showHistoryModal = ref(false)
const historyDoctor = ref<Doctor | null>(null)
const relationshipHistory = ref<RelationshipHistory[]>([])

// Format date to South African time
const formatSATime = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Log relationship history
const logRelationshipHistory = async (
  doctorId: string,
  action: string,
  oldHospitalId: string | null,
  newHospitalId: string | null,
  oldHospitalName: string | null,
  newHospitalName: string | null
) => {
  try {
    await supabase.from('relationship_history').insert({
      doctor_id: doctorId,
      action,
      old_hospital_id: oldHospitalId,
      new_hospital_id: newHospitalId,
      old_hospital_name: oldHospitalName,
      new_hospital_name: newHospitalName,
      changed_by: user.value?.email || 'unknown'
    })
  } catch (err) {
    console.error('Error logging relationship history:', err)
  }
}

// Fetch history for a doctor
const fetchRelationshipHistory = async (doctorId: string) => {
  try {
    const { data, error } = await supabase
      .from('relationship_history')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('changed_at', { ascending: false })
      .limit(10)

    if (error) throw error
    relationshipHistory.value = data || []
  } catch (err) {
    console.error('Error fetching history:', err)
    relationshipHistory.value = []
  }
}

// Show history modal
const showHistory = async (doctor: Doctor) => {
  historyDoctor.value = doctor
  await fetchRelationshipHistory(doctor.id)
  showHistoryModal.value = true
}

// Get action color
const getActionColor = (action: string) => {
  switch (action) {
    case 'linked': return 'text-green-600 bg-green-50'
    case 'unlinked': return 'text-red-600 bg-red-50'
    case 'transferred': return 'text-blue-600 bg-blue-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

const relationshipsByHospital = computed(() => {
  return hospitals.value.map((hospital) => ({
    ...hospital,
    doctors: relationships.value
      .filter((r) => r.hospital_id === hospital.id)
      .map((r) => r.doctors)
      .filter(Boolean)
  }))
})

const relationshipsByDoctor = computed(() => {
  return doctors.value.map((doctor) => ({
    ...doctor,
    hospitals: relationships.value
      .filter((r) => r.doctor_id === doctor.id)
      .map((r) => r.hospitals)
      .filter(Boolean)
  }))
})

const fetchData = async () => {
  try {
    const [relRes, docRes, hospRes] = await Promise.all([
      supabase.from('doctor_hospitals').select(`
        id,
        doctor_id,
        hospital_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by,
        doctors (id, title, full_name, disciplines),
        hospitals (id, name, city)
      `),
      supabase.from('doctors').select('id, title, full_name, disciplines').order('full_name'),
      supabase.from('hospitals').select('id, name, city').order('name')
    ])

    if (relRes.error) throw relRes.error
    if (docRes.error) throw docRes.error
    if (hospRes.error) throw hospRes.error

    relationships.value = relRes.data || []
    doctors.value = docRes.data || []
    hospitals.value = hospRes.data || []
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!selectedDoctor.value || !selectedHospital.value) {
    alert('Please select both a doctor and a hospital')
    return
  }

  const exists = relationships.value.some(
    (r) => r.doctor_id === selectedDoctor.value && r.hospital_id === selectedHospital.value
  )

  if (exists) {
    alert('This relationship already exists')
    return
  }

  try {
    const hospital = hospitals.value.find(h => h.id === selectedHospital.value)
    const userEmail = user.value?.email || 'unknown'

    const { error } = await supabase.from('doctor_hospitals').insert([
      {
        doctor_id: selectedDoctor.value,
        hospital_id: selectedHospital.value,
        status: 'new',
        created_at: new Date().toISOString(),
        created_by: userEmail
      }
    ])

    if (error) throw error

    // Log history
    await logRelationshipHistory(
      selectedDoctor.value,
      'linked',
      null,
      selectedHospital.value,
      null,
      hospital?.name || 'Unknown'
    )

    showModal.value = false
    selectedDoctor.value = ''
    selectedHospital.value = ''
    fetchData()
  } catch (error: any) {
    console.error('Error creating relationship:', error)
    alert('Error creating relationship: ' + error.message)
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to remove this relationship?')) return

  try {
    // Find the relationship to get doctor and hospital info
    const rel = relationships.value.find(r => r.id === id)

    const { error } = await supabase.from('doctor_hospitals').delete().eq('id', id)
    if (error) throw error

    // Log history
    if (rel) {
      await logRelationshipHistory(
        rel.doctor_id,
        'unlinked',
        rel.hospital_id,
        null,
        rel.hospitals?.name || 'Unknown',
        null
      )
    }

    fetchData()
  } catch (error: any) {
    console.error('Error deleting relationship:', error)
    alert('Error deleting relationship: ' + error.message)
  }
}

// Open transfer modal
const openTransferModal = (rel: Relationship) => {
  transferRelationship.value = rel
  newHospitalId.value = ''
  showTransferModal.value = true
}

// Handle hospital transfer
const handleTransfer = async () => {
  if (!transferRelationship.value || !newHospitalId.value) {
    alert('Please select a new hospital')
    return
  }

  if (newHospitalId.value === transferRelationship.value.hospital_id) {
    alert('Please select a different hospital')
    return
  }

  try {
    const oldHospital = transferRelationship.value.hospitals
    const newHospital = hospitals.value.find(h => h.id === newHospitalId.value)
    const userEmail = user.value?.email || 'unknown'

    // Update the relationship
    const { error } = await supabase
      .from('doctor_hospitals')
      .update({
        hospital_id: newHospitalId.value,
        status: 'transferred',
        updated_at: new Date().toISOString(),
        updated_by: userEmail
      })
      .eq('id', transferRelationship.value.id)

    if (error) throw error

    // Log history
    await logRelationshipHistory(
      transferRelationship.value.doctor_id,
      'transferred',
      transferRelationship.value.hospital_id,
      newHospitalId.value,
      oldHospital?.name || 'Unknown',
      newHospital?.name || 'Unknown'
    )

    showTransferModal.value = false
    transferRelationship.value = null
    newHospitalId.value = ''
    fetchData()
  } catch (error: any) {
    console.error('Error transferring doctor:', error)
    alert('Error transferring doctor: ' + error.message)
  }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-lenmed-navy">Doctor-Hospital Relationships</h1>
      <div class="flex items-center gap-3">
        <div class="flex bg-gray-100 rounded-lg p-1">
          <button
            @click="viewMode = 'list'"
            :class="[
              'px-3 py-1 rounded-md text-sm transition-colors',
              viewMode === 'list' ? 'bg-white shadow text-lenmed-navy' : 'text-lenmed-grey'
            ]"
          >
            List
          </button>
          <button
            @click="viewMode = 'visual'"
            :class="[
              'px-3 py-1 rounded-md text-sm transition-colors',
              viewMode === 'visual' ? 'bg-white shadow text-lenmed-navy' : 'text-lenmed-grey'
            ]"
          >
            Visual
          </button>
        </div>
        <button
          @click="showModal = true"
          class="flex items-center gap-2 bg-lenmed-blue text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
        >
          <Plus :size="20" />
          Link Doctor
        </button>
      </div>
    </div>

    <div v-if="loading" class="bg-white rounded-lg shadow p-8 text-center text-lenmed-grey">
      Loading...
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="relationships.length === 0" class="p-8 text-center text-lenmed-grey">
        No relationships yet. Link a doctor to a hospital to get started!
      </div>
      <table v-else class="w-full">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Status</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Title</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Full Name</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Hospital</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Last Changed</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-lenmed-grey">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="rel in relationships" :key="rel.id" class="hover:bg-gray-50">
            <!-- Status -->
            <td class="px-6 py-4">
              <span
                v-if="rel.status"
                :class="[
                  'px-2 py-1 rounded text-xs font-medium capitalize',
                  rel.status === 'new' ? 'bg-green-100 text-green-700' :
                  rel.status === 'transferred' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                ]"
              >
                {{ rel.status }}
              </span>
              <span v-else class="text-gray-400 text-sm">-</span>
            </td>
            <td class="px-6 py-4 text-lenmed-grey">
              {{ rel.doctors?.title || '-' }}
            </td>
            <td class="px-6 py-4 font-medium text-lenmed-navy">
              {{ rel.doctors?.full_name || '-' }}
            </td>
            <td class="px-6 py-4 font-medium text-lenmed-blue">
              {{ rel.hospitals?.name || 'Unknown' }}
            </td>
            <!-- Last Changed -->
            <td class="px-6 py-4">
              <div v-if="rel.updated_at || rel.created_at" class="text-xs space-y-1">
                <div class="flex items-center gap-1 text-gray-600">
                  <Clock :size="12" />
                  <span>{{ formatSATime(rel.updated_at || rel.created_at) }}</span>
                </div>
                <div v-if="rel.updated_by || rel.created_by" class="flex items-center gap-1 text-gray-400">
                  <User :size="12" />
                  <span class="truncate max-w-[100px]">{{ rel.updated_by || rel.created_by }}</span>
                </div>
              </div>
              <span v-else class="text-gray-400 text-sm">-</span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="showHistory(rel.doctors)"
                  class="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                  title="View history"
                >
                  <History :size="18" />
                </button>
                <button
                  @click="openTransferModal(rel)"
                  class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Transfer to another hospital"
                >
                  <RefreshCw :size="18" />
                </button>
                <button
                  @click="handleDelete(rel.id)"
                  class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove relationship"
                >
                  <Trash2 :size="18" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Visual View -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- By Hospital -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-lenmed-navy mb-4 flex items-center gap-2">
          <Building2 :size="20" class="text-lenmed-blue" />
          Grouped by Hospital
        </h3>
        <div class="space-y-4">
          <div v-for="hospital in relationshipsByHospital" :key="hospital.id" class="border rounded-lg p-4">
            <h4 class="font-medium text-lenmed-navy">{{ hospital.name }}</h4>
            <p class="text-sm text-lenmed-grey mb-2">{{ hospital.city }}</p>
            <div v-if="hospital.doctors.length > 0" class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="doctor in hospital.doctors"
                :key="doctor.id"
                class="inline-flex items-center gap-1 bg-lenmed-blue/10 text-lenmed-blue px-3 py-1 rounded-full text-sm"
              >
                <Users :size="14" />
                {{ doctor.full_name || doctor.title }}
              </span>
            </div>
            <p v-else class="text-sm text-gray-400 italic">No doctors linked</p>
          </div>
          <p v-if="hospitals.length === 0" class="text-lenmed-grey text-center py-4">
            No hospitals added yet
          </p>
        </div>
      </div>

      <!-- By Doctor -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-lenmed-navy mb-4 flex items-center gap-2">
          <Users :size="20" class="text-lenmed-green" />
          Grouped by Doctor
        </h3>
        <div class="space-y-4">
          <div v-for="doctor in relationshipsByDoctor" :key="doctor.id" class="border rounded-lg p-4">
            <h4 class="font-medium text-lenmed-navy">{{ doctor.full_name || doctor.title }}</h4>
            <p class="text-sm text-lenmed-grey mb-2">{{ doctor.disciplines }}</p>
            <div v-if="doctor.hospitals.length > 0" class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="hospital in doctor.hospitals"
                :key="hospital.id"
                class="inline-flex items-center gap-1 bg-lenmed-green/10 text-lenmed-green px-3 py-1 rounded-full text-sm"
              >
                <Building2 :size="14" />
                {{ hospital.name }}
              </span>
            </div>
            <p v-else class="text-sm text-gray-400 italic">No hospitals linked</p>
          </div>
          <p v-if="doctors.length === 0" class="text-lenmed-grey text-center py-4">
            No doctors added yet
          </p>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold text-lenmed-navy">Link Doctor to Hospital</h2>
          <button @click="showModal = false" class="p-1 hover:bg-gray-100 rounded">
            <X :size="20" />
          </button>
        </div>
        <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Select Doctor *</label>
            <select
              v-model="selectedDoctor"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              required
            >
              <option value="">Choose a doctor...</option>
              <option v-for="doctor in doctors" :key="doctor.id" :value="doctor.id">
                {{ doctor.full_name || doctor.title }}
                {{ doctor.disciplines ? `(${doctor.disciplines})` : '' }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Select Hospital *</label>
            <select
              v-model="selectedHospital"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              required
            >
              <option value="">Choose a hospital...</option>
              <option v-for="hospital in hospitals" :key="hospital.id" :value="hospital.id">
                {{ hospital.name }} {{ hospital.city ? `(${hospital.city})` : '' }}
              </option>
            </select>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showModal = false"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 bg-lenmed-navy text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Link Doctor
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Transfer Modal -->
    <div v-if="showTransferModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold text-lenmed-navy">Transfer Doctor to Another Hospital</h2>
          <button @click="showTransferModal = false" class="p-1 hover:bg-gray-100 rounded">
            <X :size="20" />
          </button>
        </div>
        <div class="p-4 space-y-4">
          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-sm text-gray-600">Doctor:</p>
            <p class="font-medium text-lenmed-navy">{{ transferRelationship?.doctors?.full_name || transferRelationship?.doctors?.title }}</p>
            <p class="text-sm text-gray-600 mt-2">Current Hospital:</p>
            <p class="font-medium text-lenmed-blue">{{ transferRelationship?.hospitals?.name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Transfer to Hospital *</label>
            <select
              v-model="newHospitalId"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            >
              <option value="">Choose a new hospital...</option>
              <option
                v-for="hospital in hospitals"
                :key="hospital.id"
                :value="hospital.id"
                :disabled="hospital.id === transferRelationship?.hospital_id"
              >
                {{ hospital.name }} {{ hospital.city ? `(${hospital.city})` : '' }}
                {{ hospital.id === transferRelationship?.hospital_id ? '(current)' : '' }}
              </option>
            </select>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showTransferModal = false"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleTransfer"
              class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Transfer
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- History Modal -->
    <div v-if="showHistoryModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold text-lenmed-navy flex items-center gap-2">
            <History :size="20" />
            Hospital Assignment History
          </h2>
          <button @click="showHistoryModal = false" class="p-1 hover:bg-gray-100 rounded">
            <X :size="20" />
          </button>
        </div>
        <div class="p-4">
          <div class="bg-gray-50 rounded-lg p-3 mb-4">
            <p class="font-medium text-lenmed-navy">{{ historyDoctor?.full_name || historyDoctor?.title }}</p>
            <p class="text-sm text-gray-600">{{ historyDoctor?.disciplines }}</p>
          </div>
          <div v-if="relationshipHistory.length === 0" class="text-center text-gray-500 py-4">
            No history recorded yet
          </div>
          <div v-else class="space-y-3 max-h-[400px] overflow-y-auto">
            <div
              v-for="entry in relationshipHistory"
              :key="entry.id"
              class="bg-white border rounded-lg p-3 shadow-sm"
            >
              <div class="flex items-center justify-between mb-2">
                <span :class="['px-2 py-0.5 rounded text-xs font-medium capitalize', getActionColor(entry.action)]">
                  {{ entry.action }}
                </span>
                <span class="text-xs text-gray-500">{{ formatSATime(entry.changed_at) }}</span>
              </div>
              <div class="text-sm">
                <div v-if="entry.action === 'linked'" class="text-green-600">
                  Linked to <span class="font-medium">{{ entry.new_hospital_name }}</span>
                </div>
                <div v-else-if="entry.action === 'unlinked'" class="text-red-600">
                  Unlinked from <span class="font-medium">{{ entry.old_hospital_name }}</span>
                </div>
                <div v-else-if="entry.action === 'transferred'" class="text-blue-600">
                  <span class="text-red-500 line-through">{{ entry.old_hospital_name }}</span>
                  <span class="mx-2">→</span>
                  <span class="font-medium text-green-600">{{ entry.new_hospital_name }}</span>
                </div>
              </div>
              <div class="text-xs text-gray-400 mt-1">By: {{ entry.changed_by }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
