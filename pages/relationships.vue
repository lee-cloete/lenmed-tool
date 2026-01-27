<script setup lang="ts">
import { Plus, Trash2, X, Users, Building2 } from 'lucide-vue-next'

const supabase = useSupabaseClient()

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
}

const relationships = ref<Relationship[]>([])
const doctors = ref<Doctor[]>([])
const hospitals = ref<Hospital[]>([])
const loading = ref(true)
const showModal = ref(false)
const selectedDoctor = ref('')
const selectedHospital = ref('')
const viewMode = ref<'list' | 'visual'>('list')

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
    const { error } = await supabase.from('doctor_hospitals').insert([
      { doctor_id: selectedDoctor.value, hospital_id: selectedHospital.value }
    ])

    if (error) throw error

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
    const { error } = await supabase.from('doctor_hospitals').delete().eq('id', id)
    if (error) throw error
    fetchData()
  } catch (error: any) {
    console.error('Error deleting relationship:', error)
    alert('Error deleting relationship: ' + error.message)
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
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Doctor</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Disciplines</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Hospital</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">City</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-lenmed-grey">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="rel in relationships" :key="rel.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 font-medium text-lenmed-navy">
              {{ rel.doctors?.full_name || rel.doctors?.title || 'Unknown' }}
            </td>
            <td class="px-6 py-4 text-lenmed-grey text-sm">
              {{ rel.doctors?.disciplines || '-' }}
            </td>
            <td class="px-6 py-4 font-medium text-lenmed-blue">
              {{ rel.hospitals?.name || 'Unknown' }}
            </td>
            <td class="px-6 py-4 text-lenmed-grey">
              {{ rel.hospitals?.city || '-' }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end">
                <button
                  @click="handleDelete(rel.id)"
                  class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
  </div>
</template>
