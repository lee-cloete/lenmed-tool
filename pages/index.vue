<script setup lang="ts">
import { Users, Building2, Link2 } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

const stats = ref({
  doctors: 0,
  hospitals: 0,
  relationships: 0
})
const loading = ref(true)

const statCards = computed(() => [
  { label: 'Doctors', value: stats.value.doctors, icon: Users, color: 'bg-lenmed-blue' },
  { label: 'Hospitals', value: stats.value.hospitals, icon: Building2, color: 'bg-lenmed-navy' },
  { label: 'Relationships', value: stats.value.relationships, icon: Link2, color: 'bg-lenmed-green' }
])

onMounted(async () => {
  try {
    const [doctorsRes, hospitalsRes, relationsRes] = await Promise.all([
      supabase.from('doctors').select('id', { count: 'exact', head: true }),
      supabase.from('hospitals').select('id', { count: 'exact', head: true }),
      supabase.from('doctor_hospitals').select('id', { count: 'exact', head: true })
    ])

    stats.value = {
      doctors: doctorsRes.count || 0,
      hospitals: hospitalsRes.count || 0,
      relationships: relationsRes.count || 0
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-lenmed-navy mb-6">Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="card in statCards" :key="card.label" class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-lenmed-grey text-sm">{{ card.label }}</p>
            <p class="text-3xl font-bold text-lenmed-navy mt-1">
              {{ loading ? '...' : card.value }}
            </p>
          </div>
          <div :class="[card.color, 'p-3 rounded-lg']">
            <component :is="card.icon" class="text-white" :size="24" />
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8 bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-lenmed-navy mb-4">Quick Start Guide</h2>
      <div class="space-y-3 text-lenmed-grey">
        <p>1. Add your hospitals in the <span class="text-lenmed-blue font-medium">Hospitals</span> section</p>
        <p>2. Add your doctors in the <span class="text-lenmed-blue font-medium">Doctors</span> section</p>
        <p>3. Link doctors to hospitals in the <span class="text-lenmed-blue font-medium">Relationships</span> section</p>
        <p>4. View and manage all relationships from the visualization</p>
      </div>
    </div>
  </div>
</template>
