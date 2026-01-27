<script setup lang="ts">
import { Plus, Pencil, Trash2, X, Search, RotateCcw, CirclePlus, RefreshCw, Trash } from 'lucide-vue-next'

const supabase = useSupabaseClient()

type DoctorStatus = 'new' | 'updated' | 'deleted' | null

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
}

const doctors = ref<Doctor[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingDoctor = ref<Doctor | null>(null)
const searchTerm = ref('')
const statusFilter = ref<string>('all')

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
    doctors.value = data || []
  } catch (error) {
    console.error('Error fetching doctors:', error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  try {
    if (editingDoctor.value) {
      // Update existing doctor and set status to 'updated'
      const updateData = { ...formData.value, status: 'updated' }
      const { error } = await supabase
        .from('doctors')
        .update(updateData)
        .eq('id', editingDoctor.value.id)

      if (error) throw error
    } else {
      // Create new doctor with status 'new'
      const insertData = { ...formData.value, status: 'new' }
      const { error } = await supabase
        .from('doctors')
        .insert([insertData])

      if (error) throw error
    }

    showModal.value = false
    editingDoctor.value = null
    resetForm()
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
    // Soft delete - mark status as 'deleted' instead of actually deleting
    const { error } = await supabase
      .from('doctors')
      .update({ status: 'deleted' })
      .eq('id', id)
    if (error) throw error
    fetchDoctors()
  } catch (error: any) {
    console.error('Error marking doctor for removal:', error)
    alert('Error marking doctor for removal: ' + error.message)
  }
}

const handleRestore = async (id: string) => {
  try {
    const { error } = await supabase
      .from('doctors')
      .update({ status: null })
      .eq('id', id)
    if (error) throw error
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
    const { error } = await supabase
      .from('doctors')
      .update({ status: null })
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
}

onMounted(fetchDoctors)
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
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Name</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Disciplines</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Email</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Phone</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-lenmed-grey">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr
            v-for="doctor in filteredDoctors"
            :key="doctor.id"
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
            <td class="px-6 py-4">
              <div :class="['font-medium', doctor.status === 'deleted' ? 'text-gray-400 line-through' : 'text-lenmed-navy']">
                {{ doctor.title }} {{ doctor.full_name }}
              </div>
            </td>
            <td class="px-6 py-4 text-lenmed-grey text-sm">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="disc in (doctor.disciplines || '').split('|').filter(Boolean)"
                  :key="disc"
                  :class="[
                    'px-2 py-0.5 rounded text-xs',
                    doctor.status === 'deleted' ? 'bg-gray-100 text-gray-400' : 'bg-lenmed-blue/10 text-lenmed-blue'
                  ]"
                >
                  {{ disc }}
                </span>
              </div>
            </td>
            <td :class="['px-6 py-4', doctor.status === 'deleted' ? 'text-gray-400' : 'text-lenmed-grey']">
              {{ doctor.email || '-' }}
            </td>
            <td :class="['px-6 py-4', doctor.status === 'deleted' ? 'text-gray-400' : 'text-lenmed-grey']">
              {{ doctor.phone1 || '-' }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-1">
                <!-- Actions for deleted doctors -->
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
                <!-- Normal actions -->
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
                    @click="handleEdit(doctor)"
                    class="p-2 text-lenmed-blue hover:bg-lenmed-blue/10 rounded-lg transition-colors"
                    title="Edit doctor"
                  >
                    <Pencil :size="18" />
                  </button>
                  <button
                    @click="handleDelete(doctor.id)"
                    class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Mark for removal"
                  >
                    <Trash2 :size="18" />
                  </button>
                </template>
              </div>
            </td>
          </tr>
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
          <button @click="showModal = false" class="p-1 hover:bg-gray-100 rounded">
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
            <input
              v-model="formData.disciplines"
              type="text"
              placeholder="Separate multiple with | e.g. Cardiologist|Physician"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            />
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
              @click="showModal = false"
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
