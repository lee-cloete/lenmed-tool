<script setup lang="ts">
import { Home, Users, Building2, Link2, LogOut } from 'lucide-vue-next'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/doctors', icon: Users, label: 'Doctors' },
  { path: '/hospitals', icon: Building2, label: 'Hospitals' },
  { path: '/relationships', icon: Link2, label: 'Relationships' },
]

const handleSignOut = async () => {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div v-if="user" class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-lenmed-navy text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-lenmed-blue rounded-lg flex items-center justify-center">
            <span class="font-bold text-sm">L</span>
          </div>
          <span class="text-xl font-bold">Lenmed</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-300">{{ user?.email }}</span>
          <button
            @click="handleSignOut"
            class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut :size="18" />
            <span class="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </header>

    <div class="flex">
      <!-- Sidebar -->
      <nav class="w-64 bg-white shadow-lg min-h-[calc(100vh-72px)]">
        <ul class="p-4 space-y-2">
          <li v-for="item in navItems" :key="item.path">
            <NuxtLink
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                route.path === item.path
                  ? 'bg-lenmed-blue text-white'
                  : 'text-lenmed-grey hover:bg-gray-100'
              ]"
            >
              <component :is="item.icon" :size="20" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Main Content -->
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>

  <!-- Auth pages (no layout) -->
  <div v-else>
    <slot />
  </div>
</template>
