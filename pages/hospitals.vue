<script setup lang="ts">
import { Plus, Pencil, Trash2, X, Search } from 'lucide-vue-next'

const supabase = useSupabaseClient()

interface Hospital {
  id: string
  name: string
  address: string
  city: string
  phone: string
  email: string
  notes: string
}

const hospitals = ref<Hospital[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingHospital = ref<Hospital | null>(null)
const searchTerm = ref('')

const formData = ref({
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  notes: ''
})

const filteredHospitals = computed(() => {
  return hospitals.value.filter(
    (hospital) =>
      hospital.name?.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      hospital.city?.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

const fetchHospitals = async () => {
  try {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('name')

    if (error) throw error
    hospitals.value = data || []
  } catch (error) {
    console.error('Error fetching hospitals:', error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  try {
    if (editingHospital.value) {
      const { error } = await supabase
        .from('hospitals')
        .update(formData.value)
        .eq('id', editingHospital.value.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('hospitals')
        .insert([formData.value])

      if (error) throw error
    }

    showModal.value = false
    editingHospital.value = null
    resetForm()
    fetchHospitals()
  } catch (error: any) {
    console.error('Error saving hospital:', error)
    alert('Error saving hospital: ' + error.message)
  }
}

const handleEdit = (hospital: Hospital) => {
  editingHospital.value = hospital
  formData.value = {
    name: hospital.name || '',
    address: hospital.address || '',
    city: hospital.city || '',
    phone: hospital.phone || '',
    email: hospital.email || '',
    notes: hospital.notes || ''
  }
  showModal.value = true
}

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this hospital?')) return

  try {
    const { error } = await supabase.from('hospitals').delete().eq('id', id)
    if (error) throw error
    fetchHospitals()
  } catch (error: any) {
    console.error('Error deleting hospital:', error)
    alert('Error deleting hospital: ' + error.message)
  }
}

const openNewModal = () => {
  editingHospital.value = null
  resetForm()
  showModal.value = true
}

const resetForm = () => {
  formData.value = {
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    notes: ''
  }
}

onMounted(fetchHospitals)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-lenmed-navy">Hospitals</h1>
      <button
        @click="openNewModal"
        class="flex items-center gap-2 bg-lenmed-blue text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
      >
        <Plus :size="20" />
        Add Hospital
      </button>
    </div>

    <!-- Search -->
    <div class="mb-4 relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="20" />
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Search hospitals..."
        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
      />
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-lenmed-grey">Loading...</div>
      <div v-else-if="filteredHospitals.length === 0" class="p-8 text-center text-lenmed-grey">
        {{ searchTerm ? 'No hospitals found matching your search.' : 'No hospitals yet. Add your first hospital!' }}
      </div>
      <table v-else class="w-full">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Name</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">City</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Address</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Phone</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-lenmed-grey">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="hospital in filteredHospitals" :key="hospital.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 font-medium text-lenmed-navy">{{ hospital.name }}</td>
            <td class="px-6 py-4 text-lenmed-grey">{{ hospital.city || '-' }}</td>
            <td class="px-6 py-4 text-lenmed-grey">{{ hospital.address || '-' }}</td>
            <td class="px-6 py-4 text-lenmed-grey">{{ hospital.phone || '-' }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="handleEdit(hospital)"
                  class="p-2 text-lenmed-blue hover:bg-lenmed-blue/10 rounded-lg transition-colors"
                >
                  <Pencil :size="18" />
                </button>
                <button
                  @click="handleDelete(hospital.id)"
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

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold text-lenmed-navy">
            {{ editingHospital ? 'Edit Hospital' : 'Add Hospital' }}
          </h2>
          <button @click="showModal = false" class="p-1 hover:bg-gray-100 rounded">
            <X :size="20" />
          </button>
        </div>
        <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Name *</label>
            <input
              v-model="formData.name"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">City</label>
            <input
              v-model="formData.city"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Address</label>
            <input
              v-model="formData.address"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Phone</label>
            <input
              v-model="formData.phone"
              type="tel"
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
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Notes</label>
            <textarea
              v-model="formData.notes"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              rows="3"
            />
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
              {{ editingHospital ? 'Save Changes' : 'Add Hospital' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
