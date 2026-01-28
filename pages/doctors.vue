<script setup lang="ts">
import { Plus, Pencil, Trash2, X, Search, RotateCcw, CirclePlus, RefreshCw, Trash, Clock, User, History, ChevronDown, ChevronUp, Check } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Disciplines list
const DISCIPLINES = [
  'Anaesthetist',
  'Anesthesiologist',
  'Audiologist',
  'Audiologist & Speech Therapist',
  'Biokineticist',
  'Cardiac Electrophysiologist',
  'Cardiac Technologist',
  'Cardiologist',
  'Cardiothoracic Surgeon',
  'Child & Adolescent Psychiatrist',
  'Clinical Psychologist',
  'Counseling Psychologist',
  'Dentist',
  'Dermatologist',
  'Dietician',
  'Educational Psychologist',
  'Emergency Medicine',
  'Endocrinologist',
  'Family Medicine',
  'Family Physician',
  'Gastroenterologist',
  'General Practitioner',
  'General Surgeon',
  'Geriatric Medicine',
  'Gynaecological Oncologist',
  'Gynaecologist',
  'Hepatobiliary Surgeon',
  'Infectious Disease',
  'Intensivist',
  'Interventional Cardiologist',
  'Interventional Radiologist',
  'Maxillofacial & Oral Surgeon',
  'Medical Oncologist',
  'Nephrologist',
  'Neurologist',
  'Neurophysiologist',
  'Neuropsychologist',
  'Neurosurgeon',
  'Nuclear Medicine',
  'Nutritionist',
  'Obstetrician',
  'Obstetrician & Gynaecologist',
  'Occupational Health',
  'Occupational Therapist',
  'Oncologist (Medical or Radiation)',
  'Ophthalmologist',
  'Optometrist',
  'Orthopaedic Surgeon',
  'Orthotist',
  'Orthotist & Prosthetist',
  'Paediatric Cardiologist',
  'Paediatric Endocrinologist',
  'Paediatric Geneticist',
  'Paediatric Haematologist',
  'Paediatric Intensivist',
  'Paediatric Neurologist',
  'Paediatric Oncologist',
  'Paediatric Orthopaedic Surgeon',
  'Paediatric Pulmonologist',
  'Paediatric Surgeon',
  'Paediatrician',
  'Pathologist',
  'Physician (Internal Medicine)',
  'Physiotherapist',
  'Plastic & Reconstructive Surgeon',
  'Podiatrist',
  'Proctologist',
  'Psychiatrist',
  'Psychologist',
  'Pulmonologist',
  'Radiation Oncologist',
  'Radiographer (Theatre)',
  'Radiologist',
  'Rheumatologist',
  'Social Worker',
  'Speech Therapist',
  'Surgeon',
  'Transplant Surgeon',
  'Urologist',
  'Vascular Surgeon'
]

// User profile for permission checking
interface UserProfile {
  hospital_id: string | null
  role: string
}
const userProfile = ref<UserProfile | null>(null)

type DoctorStatus = 'new' | 'updated' | 'deleted' | null

// Normalize status - treat 'publish' (old WordPress value) as null
const normalizeStatus = (status: string | null): DoctorStatus => {
  if (status === 'publish' || !status) return null
  if (status === 'new' || status === 'updated' || status === 'deleted') return status
  return null
}

// Format date to South African time (SAST - UTC+2)
const formatSATime = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format date shorter for history
const formatSATimeShort = (dateStr: string | null): string => {
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

interface Doctor {
  id: string
  title: string
  full_name: string
  disciplines: string
  phone1: string
  phone2: string
  phone3: string
  email: string
  bio_link: boolean
  permalink: string
  notes: string
  status: DoctorStatus
  created_at: string | null
  created_by: string | null
  updated_at: string | null
  updated_by: string | null
}

interface HistoryEntry {
  id: string
  doctor_id: string
  action: string
  changes: Record<string, { old: any; new: any }> | null
  changed_by: string
  changed_at: string
}

const doctors = ref<Doctor[]>([])
const doctorHospitals = ref<Record<string, string[]>>({}) // doctorId -> hospitalIds
const loading = ref(true)
const showModal = ref(false)
const editingDoctor = ref<Doctor | null>(null)
const searchTerm = ref('')
const statusFilter = ref<string>('all')
const expandedHistoryId = ref<string | null>(null)
const doctorHistory = ref<Record<string, HistoryEntry[]>>({})
const showDisciplineDropdown = ref(false)
const disciplineSearch = ref('')

// Fetch user profile for permissions
const fetchUserProfile = async () => {
  if (!user.value?.email) return
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('hospital_id, role')
      .eq('email', user.value.email)
      .single()
    userProfile.value = data
  } catch (err) {
    console.error('Error fetching user profile:', err)
  }
}

// Fetch doctor-hospital relationships to check edit permissions
const fetchDoctorHospitals = async () => {
  try {
    const { data } = await supabase
      .from('doctor_hospitals')
      .select('doctor_id, hospital_id')

    const mapping: Record<string, string[]> = {}
    for (const row of (data || [])) {
      if (!mapping[row.doctor_id]) mapping[row.doctor_id] = []
      mapping[row.doctor_id].push(row.hospital_id)
    }
    doctorHospitals.value = mapping
  } catch (err) {
    console.error('Error fetching doctor hospitals:', err)
  }
}

// Check if current user can edit a specific doctor
const canEditDoctor = (doctorId: string): boolean => {
  // Admin or no hospital restriction = can edit all
  if (!userProfile.value?.hospital_id || userProfile.value.role === 'admin') {
    return true
  }

  // Check if doctor is linked to user's hospital
  const doctorHospitalIds = doctorHospitals.value[doctorId] || []
  return doctorHospitalIds.includes(userProfile.value.hospital_id)
}

// Filter disciplines by search
const filteredDisciplines = computed(() => {
  if (!disciplineSearch.value) return DISCIPLINES
  const search = disciplineSearch.value.toLowerCase()
  return DISCIPLINES.filter(d => d.toLowerCase().includes(search))
})

// Selected disciplines as array
const selectedDisciplines = computed({
  get: () => {
    if (!formData.value.disciplines) return []
    return formData.value.disciplines.split('|').filter(Boolean)
  },
  set: (val: string[]) => {
    formData.value.disciplines = val.join('|')
  }
})

const toggleDiscipline = (discipline: string) => {
  const current = selectedDisciplines.value
  if (current.includes(discipline)) {
    selectedDisciplines.value = current.filter(d => d !== discipline)
  } else {
    selectedDisciplines.value = [...current, discipline]
  }
}

// Log history entry
const logHistory = async (doctorId: string, action: string, changes: Record<string, { old: any; new: any }> | null = null) => {
  try {
    const { error } = await supabase.from('doctor_history').insert({
      doctor_id: doctorId,
      action,
      changes,
      changed_by: user.value?.email || 'unknown'
    })
    if (error) console.error('Error logging history:', error)
  } catch (err) {
    console.error('Error logging history:', err)
  }
}

// Fetch history for a doctor
const fetchDoctorHistory = async (doctorId: string) => {
  try {
    const { data, error } = await supabase
      .from('doctor_history')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('changed_at', { ascending: false })
      .limit(5)

    if (error) throw error
    doctorHistory.value[doctorId] = data || []
  } catch (err) {
    console.error('Error fetching history:', err)
    doctorHistory.value[doctorId] = []
  }
}

// Toggle history dropdown
const toggleHistory = async (doctorId: string) => {
  if (expandedHistoryId.value === doctorId) {
    expandedHistoryId.value = null
  } else {
    expandedHistoryId.value = doctorId
    if (!doctorHistory.value[doctorId]) {
      await fetchDoctorHistory(doctorId)
    }
  }
}

// Get action color
const getActionColor = (action: string) => {
  switch (action) {
    case 'created': return 'text-green-600 bg-green-50'
    case 'updated': return 'text-yellow-600 bg-yellow-50'
    case 'deleted': return 'text-red-600 bg-red-50'
    case 'restored': return 'text-blue-600 bg-blue-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

// Calculate changes between old and new doctor data
const calculateChanges = (oldData: any, newData: any): Record<string, { old: any; new: any }> => {
  const changes: Record<string, { old: any; new: any }> = {}
  const fieldsToTrack = ['title', 'full_name', 'disciplines', 'phone1', 'phone2', 'phone3', 'email', 'notes', 'status']

  for (const field of fieldsToTrack) {
    if (oldData[field] !== newData[field]) {
      changes[field] = { old: oldData[field] || '', new: newData[field] || '' }
    }
  }
  return changes
}

const formData = ref({
  title: '',
  full_name: '',
  disciplines: '',
  phone1: '',
  phone2: '',
  phone3: '',
  email: '',
  bio_link: false,
  permalink: '',
  notes: '',
  status: null as DoctorStatus
})

const filteredDoctors = computed(() => {
  return doctors.value.filter((doctor) => {
    const matchesSearch =
      doctor.full_name?.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      doctor.disciplines?.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      doctor.title?.toLowerCase().includes(searchTerm.value.toLowerCase())

    const matchesStatus = statusFilter.value === 'all' || doctor.status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

const statusCounts = computed(() => ({
  all: doctors.value.length,
  new: doctors.value.filter(d => d.status === 'new').length,
  updated: doctors.value.filter(d => d.status === 'updated').length,
  deleted: doctors.value.filter(d => d.status === 'deleted').length,
}))

const getStatusColor = (status: DoctorStatus) => {
  switch (status) {
    case 'new': return 'bg-green-500'
    case 'updated': return 'bg-yellow-500'
    case 'deleted': return 'bg-red-500'
    default: return 'bg-gray-300'
  }
}

const getStatusBadge = (status: DoctorStatus) => {
  switch (status) {
    case 'new': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'New' }
    case 'updated': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Updated' }
    case 'deleted': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Removed' }
    default: return null
  }
}

const fetchDoctors = async () => {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('full_name')

    if (error) throw error
    // Normalize status values when loading
    doctors.value = (data || []).map(doc => ({
      ...doc,
      status: normalizeStatus(doc.status)
    }))
  } catch (error) {
    console.error('Error fetching doctors:', error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  try {
    const userEmail = user.value?.email || 'unknown'
    const now = new Date().toISOString()

    if (editingDoctor.value) {
      // Calculate what changed
      const changes = calculateChanges(editingDoctor.value, formData.value)

      // Update existing doctor and set status to 'updated'
      const updateData = {
        ...formData.value,
        status: 'updated',
        updated_at: now,
        updated_by: userEmail
      }
      const { error } = await supabase
        .from('doctors')
        .update(updateData)
        .eq('id', editingDoctor.value.id)

      if (error) throw error

      // Log history with changes
      await logHistory(editingDoctor.value.id, 'updated', Object.keys(changes).length > 0 ? changes : null)
    } else {
      // Create new doctor with status 'new'
      const insertData = {
        ...formData.value,
        status: 'new',
        created_at: now,
        created_by: userEmail
      }
      const { data, error } = await supabase
        .from('doctors')
        .insert([insertData])
        .select('id')
        .single()

      if (error) throw error

      // Log history for new doctor
      if (data?.id) {
        await logHistory(data.id, 'created', null)
      }
    }

    closeModal()
    editingDoctor.value = null
    fetchDoctors()
  } catch (error: any) {
    console.error('Error saving doctor:', error)
    alert('Error saving doctor: ' + error.message)
  }
}

const handleEdit = (doctor: Doctor) => {
  editingDoctor.value = doctor
  formData.value = {
    title: doctor.title || '',
    full_name: doctor.full_name || '',
    disciplines: doctor.disciplines || '',
    phone1: doctor.phone1 || '',
    phone2: doctor.phone2 || '',
    phone3: doctor.phone3 || '',
    email: doctor.email || '',
    bio_link: doctor.bio_link || false,
    permalink: doctor.permalink || '',
    notes: doctor.notes || ''
  }
  showModal.value = true
}

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to mark this doctor for removal?')) return

  try {
    const userEmail = user.value?.email || 'unknown'
    const now = new Date().toISOString()

    // Soft delete - mark status as 'deleted' and track who/when
    const { error } = await supabase
      .from('doctors')
      .update({
        status: 'deleted',
        updated_at: now,
        updated_by: userEmail
      })
      .eq('id', id)
    if (error) throw error

    // Log history
    await logHistory(id, 'deleted', null)
    fetchDoctors()
  } catch (error: any) {
    console.error('Error marking doctor for removal:', error)
    alert('Error marking doctor for removal: ' + error.message)
  }
}

const handleRestore = async (id: string) => {
  try {
    const userEmail = user.value?.email || 'unknown'
    const now = new Date().toISOString()

    // Restore clears status but keeps tracking info
    const { error } = await supabase
      .from('doctors')
      .update({
        status: null,
        updated_at: now,
        updated_by: userEmail
      })
      .eq('id', id)
    if (error) throw error

    // Log history
    await logHistory(id, 'restored', null)
    fetchDoctors()
  } catch (error: any) {
    console.error('Error restoring doctor:', error)
    alert('Error restoring doctor: ' + error.message)
  }
}

const handlePermanentDelete = async (id: string) => {
  if (!confirm('Are you sure you want to PERMANENTLY delete this doctor? This cannot be undone.')) return

  try {
    const { error } = await supabase.from('doctors').delete().eq('id', id)
    if (error) throw error
    fetchDoctors()
  } catch (error: any) {
    console.error('Error deleting doctor:', error)
    alert('Error deleting doctor: ' + error.message)
  }
}

const clearStatus = async (id: string) => {
  try {
    const userEmail = user.value?.email || 'unknown'
    const now = new Date().toISOString()

    // Clear status but keep tracking info (updated_at/by persists)
    const { error } = await supabase
      .from('doctors')
      .update({
        status: null,
        updated_at: now,
        updated_by: userEmail
      })
      .eq('id', id)
    if (error) throw error
    fetchDoctors()
  } catch (error: any) {
    console.error('Error clearing status:', error)
    alert('Error clearing status: ' + error.message)
  }
}

const openNewModal = () => {
  editingDoctor.value = null
  resetForm()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  showDisciplineDropdown.value = false
  disciplineSearch.value = ''
}

const resetForm = () => {
  formData.value = {
    title: '',
    full_name: '',
    disciplines: '',
    phone1: '',
    phone2: '',
    phone3: '',
    email: '',
    bio_link: false,
    permalink: '',
    notes: ''
  }
  showDisciplineDropdown.value = false
  disciplineSearch.value = ''
}

onMounted(() => {
  fetchUserProfile()
  fetchDoctorHospitals()
  fetchDoctors()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-lenmed-navy">Doctors</h1>
      <button
        @click="openNewModal"
        class="flex items-center gap-2 bg-lenmed-blue text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
      >
        <Plus :size="20" />
        Add Doctor
      </button>
    </div>

    <!-- Status Filter Tabs -->
    <div class="mb-4 flex flex-wrap gap-2">
      <button
        @click="statusFilter = 'all'"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
          statusFilter === 'all'
            ? 'bg-lenmed-navy text-white'
            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
        ]"
      >
        All Doctors
        <span class="ml-2 px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs">{{ statusCounts.all }}</span>
      </button>
      <button
        @click="statusFilter = 'new'"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
          statusFilter === 'new'
            ? 'bg-green-600 text-white'
            : 'bg-white text-green-700 hover:bg-green-50 border border-green-200'
        ]"
      >
        <CirclePlus :size="16" />
        New
        <span :class="[
          'px-2 py-0.5 rounded-full text-xs',
          statusFilter === 'new' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'
        ]">{{ statusCounts.new }}</span>
      </button>
      <button
        @click="statusFilter = 'updated'"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
          statusFilter === 'updated'
            ? 'bg-yellow-500 text-white'
            : 'bg-white text-yellow-700 hover:bg-yellow-50 border border-yellow-200'
        ]"
      >
        <RefreshCw :size="16" />
        Updated
        <span :class="[
          'px-2 py-0.5 rounded-full text-xs',
          statusFilter === 'updated' ? 'bg-yellow-400 text-white' : 'bg-yellow-100 text-yellow-700'
        ]">{{ statusCounts.updated }}</span>
      </button>
      <button
        @click="statusFilter = 'deleted'"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
          statusFilter === 'deleted'
            ? 'bg-red-600 text-white'
            : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
        ]"
      >
        <Trash :size="16" />
        Removed
        <span :class="[
          'px-2 py-0.5 rounded-full text-xs',
          statusFilter === 'deleted' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
        ]">{{ statusCounts.deleted }}</span>
      </button>
    </div>

    <!-- Search -->
    <div class="mb-4 relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="20" />
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Search doctors..."
        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
      />
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-lenmed-grey">Loading...</div>
      <div v-else-if="filteredDoctors.length === 0" class="p-8 text-center text-lenmed-grey">
        {{ searchTerm ? 'No doctors found matching your search.' : 'No doctors yet. Add your first doctor!' }}
      </div>
      <table v-else class="w-full">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Status</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Title</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Full Name</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Disciplines</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Last Updated (SAST)</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-lenmed-grey">Actions</th>
          </tr>
        </thead>
  
        <tbody class="divide-y">
  <template v-for="doctor in filteredDoctors" :key="doctor.id">
    <tr
      :class="[
        'transition-colors',
        doctor.status === 'deleted' ? 'bg-red-50/50' : 'hover:bg-gray-50'
      ]"
    >
      <!-- Status Column -->
      <td class="px-6 py-4">
        <div v-if="getStatusBadge(doctor.status)" class="flex items-center gap-2">
          <span :class="['w-2 h-2 rounded-full', getStatusColor(doctor.status)]"></span>
          <span
            :class="[
              'px-2 py-1 rounded text-xs font-medium border',
              getStatusBadge(doctor.status)?.bg,
              getStatusBadge(doctor.status)?.text,
              getStatusBadge(doctor.status)?.border
            ]"
          >
            {{ getStatusBadge(doctor.status)?.label }}
          </span>
        </div>
        <span v-else class="text-gray-400 text-sm">-</span>
      </td>

      <td :class="['px-6 py-4', doctor.status === 'deleted' ? 'text-gray-400' : 'text-lenmed-grey']">
        {{ doctor.title || '-' }}
      </td>

      <td class="px-6 py-4">
        <div :class="['font-medium', doctor.status === 'deleted' ? 'text-gray-400 line-through' : 'text-lenmed-navy']">
          {{ doctor.full_name || '-' }}
        </div>
      </td>

      <td class="px-6 py-4 text-lenmed-grey text-sm">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="disc in (doctor.disciplines || '').split('|').filter(Boolean)"
            :key="disc"
            :class="[
              'px-2 py-0.5 rounded text-xs',
              doctor.status === 'deleted'
                ? 'bg-gray-100 text-gray-400'
                : 'bg-lenmed-blue/10 text-lenmed-blue'
            ]"
          >
            {{ disc }}
          </span>
        </div>
      </td>

      <!-- Last Updated Column -->
      <td class="px-6 py-4">
        <div v-if="doctor.updated_at || doctor.created_at" class="text-xs space-y-1">
          <div v-if="doctor.updated_at" class="flex items-center gap-1 text-lenmed-grey">
            <Clock :size="12" />
            <span>{{ formatSATime(doctor.updated_at) }}</span>
          </div>
          <div v-else-if="doctor.created_at" class="flex items-center gap-1 text-lenmed-grey">
            <Clock :size="12" />
            <span>{{ formatSATime(doctor.created_at) }}</span>
          </div>
          <div v-if="doctor.updated_by" class="flex items-center gap-1 text-gray-400">
            <User :size="12" />
            <span class="truncate max-w-[120px]" :title="doctor.updated_by">
              {{ doctor.updated_by }}
            </span>
          </div>
          <div v-else-if="doctor.created_by" class="flex items-center gap-1 text-gray-400">
            <User :size="12" />
            <span class="truncate max-w-[120px]" :title="doctor.created_by">
              {{ doctor.created_by }}
            </span>
          </div>
        </div>
        <span v-else class="text-gray-400 text-sm">-</span>
      </td>

      <!-- Actions -->
      <td class="px-6 py-4">
        <div class="flex items-center justify-end gap-1">
          <template v-if="doctor.status === 'deleted'">
            <button
              @click="handleRestore(doctor.id)"
              class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Restore doctor"
            >
              <RotateCcw :size="18" />
            </button>
            <button
              @click="handlePermanentDelete(doctor.id)"
              class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete permanently"
            >
              <Trash2 :size="18" />
            </button>
          </template>

          <template v-else>
            <button
              v-if="doctor.status"
              @click="clearStatus(doctor.id)"
              class="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear status"
            >
              <X :size="16" />
            </button>

            <button
              @click="toggleHistory(doctor.id)"
              :class="[
                'p-2 rounded-lg transition-colors',
                expandedHistoryId === doctor.id
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-400 hover:bg-gray-100'
              ]"
              title="View history"
            >
              <History :size="18" />
            </button>

            <button
              v-if="canEditDoctor(doctor.id)"
              @click="handleEdit(doctor)"
              class="p-2 text-lenmed-blue hover:bg-lenmed-blue/10 rounded-lg transition-colors"
              title="Edit doctor"
            >
              <Pencil :size="18" />
            </button>
            <span
              v-else
              class="p-2 text-gray-300 cursor-not-allowed"
              title="You can only edit doctors at your assigned hospital"
            >
              <Pencil :size="18" />
            </span>

            <button
              v-if="canEditDoctor(doctor.id)"
              @click="handleDelete(doctor.id)"
              class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Mark for removal"
            >
              <Trash2 :size="18" />
            </button>
            <span
              v-else
              class="p-2 text-gray-300 cursor-not-allowed"
              title="You can only edit doctors at your assigned hospital"
            >
              <Trash2 :size="18" />
            </span>
          </template>
        </div>
      </td>
    </tr>

    <!-- ✅ History Expanded Row (NOW IN SCOPE) -->
    <tr v-if="expandedHistoryId === doctor.id" class="bg-purple-50/30">
      <td colspan="6" class="px-6 py-4">
        <div class="ml-4 border-l-2 border-purple-200 pl-4">
          <h4 class="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
            <History :size="16" />
            Recent Changes
          </h4>

          <div v-if="!doctorHistory[doctor.id]" class="text-sm text-gray-500">
            Loading...
          </div>

          <div
            v-else-if="doctorHistory[doctor.id].length === 0"
            class="text-sm text-gray-500"
          >
            No history recorded yet
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="entry in doctorHistory[doctor.id]"
              :key="entry.id"
              class="bg-white rounded-lg p-3 border border-gray-100 shadow-sm"
            >
              <div class="flex items-center justify-between mb-2">
                <span
                  :class="[
                    'px-2 py-0.5 rounded text-xs font-medium capitalize',
                    getActionColor(entry.action)
                  ]"
                >
                  {{ entry.action }}
                </span>
                <span class="text-xs text-gray-500">
                  {{ formatSATimeShort(entry.changed_at) }}
                </span>
              </div>

              <div class="text-xs text-gray-500 mb-1">
                By: {{ entry.changed_by }}
              </div>

              <div
                v-if="entry.changes && Object.keys(entry.changes).length > 0"
                class="mt-2 space-y-1"
              >
                <div
                  v-for="(change, field) in entry.changes"
                  :key="field"
                  class="text-xs"
                >
                  <span class="font-medium text-gray-600 capitalize">
                    {{ field }}:
                  </span>
                  <span class="text-red-500 line-through ml-1">
                    {{ change.old || '(empty)' }}
                  </span>
                  <span class="mx-1">→</span>
                  <span class="text-green-600">
                    {{ change.new || '(empty)' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  </template>
</tbody>



      </table>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 class="text-lg font-semibold text-lenmed-navy">
            {{ editingDoctor ? 'Edit Doctor' : 'Add Doctor' }}
          </h2>
          <button @click="closeModal" class="p-1 hover:bg-gray-100 rounded">
            <X :size="20" />
          </button>
        </div>
        <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-lenmed-grey mb-1">Title</label>
              <input
                v-model="formData.title"
                type="text"
                placeholder="Dr, Prof, Mrs, etc."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-lenmed-grey mb-1">Full Name *</label>
              <input
                v-model="formData.full_name"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Disciplines</label>
            <div class="relative">
              <div
                @click="showDisciplineDropdown = !showDisciplineDropdown"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer bg-white min-h-[42px] flex flex-wrap gap-1 items-center"
              >
                <template v-if="selectedDisciplines.length > 0">
                  <span
                    v-for="disc in selectedDisciplines"
                    :key="disc"
                    class="bg-lenmed-blue/10 text-lenmed-blue px-2 py-0.5 rounded text-sm flex items-center gap-1"
                  >
                    {{ disc }}
                    <button
                      type="button"
                      @click.stop="toggleDiscipline(disc)"
                      class="hover:text-red-500"
                    >
                      <X :size="14" />
                    </button>
                  </span>
                </template>
                <span v-else class="text-gray-400">Select disciplines...</span>
                <ChevronDown class="ml-auto text-gray-400" :size="18" />
              </div>

              <div
                v-if="showDisciplineDropdown"
                class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden"
              >
                <div class="p-2 border-b sticky top-0 bg-white">
                  <input
                    v-model="disciplineSearch"
                    type="text"
                    placeholder="Search disciplines..."
                    class="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                    @click.stop
                  />
                </div>
                <div class="overflow-y-auto max-h-48">
                  <div
                    v-for="discipline in filteredDisciplines"
                    :key="discipline"
                    @click="toggleDiscipline(discipline)"
                    class="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-sm"
                    :class="selectedDisciplines.includes(discipline) ? 'bg-lenmed-blue/5 text-lenmed-blue' : ''"
                  >
                    {{ discipline }}
                    <Check v-if="selectedDisciplines.includes(discipline)" :size="16" class="text-lenmed-blue" />
                  </div>
                  <div v-if="filteredDisciplines.length === 0" class="px-3 py-2 text-gray-400 text-sm">
                    No disciplines found
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Email</label>
            <input
              v-model="formData.email"
              type="email"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            />
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-lenmed-grey mb-1">Phone 1</label>
              <input
                v-model="formData.phone1"
                type="tel"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-lenmed-grey mb-1">Phone 2</label>
              <input
                v-model="formData.phone2"
                type="tel"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-lenmed-grey mb-1">Phone 3</label>
              <input
                v-model="formData.phone3"
                type="tel"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Permalink</label>
            <input
              v-model="formData.permalink"
              type="url"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Notes</label>
            <textarea
              v-model="formData.notes"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              rows="3"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="formData.bio_link"
              type="checkbox"
              id="bio_link"
              class="w-4 h-4 text-lenmed-blue rounded focus:ring-lenmed-blue"
            />
            <label for="bio_link" class="text-sm text-lenmed-grey">Display bio link</label>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="closeModal"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 bg-lenmed-navy text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
            >
              {{ editingDoctor ? 'Save Changes' : 'Add Doctor' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
