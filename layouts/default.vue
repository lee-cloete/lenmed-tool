<script setup lang="ts">
import { Home, Users, Building2, Link2, LogOut, Menu, X } from 'lucide-vue-next'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()
const mobileMenuOpen = ref(false)

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

// Close mobile menu when route changes
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})
</script>

<template>
  <div v-if="user" class="min-h-screen bg-gray-50">
    <!-- Modern Navbar -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <!-- Logo and Brand -->
          <div class="flex items-center gap-3">
            <img src="/lenlogo.png" alt="Lenmed" class="h-10 w-auto" />
            <span class="hidden sm:block text-sm text-gray-500">Doctor Management</span>
          </div>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center gap-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                route.path === item.path
                  ? 'bg-lenmed-navy text-white shadow-md'
                  : 'text-lenmed-grey hover:bg-gray-100 hover:text-lenmed-navy'
              ]"
            >
              <component :is="item.icon" :size="18" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>

          <!-- User Menu -->
          <div class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <div class="w-8 h-8 rounded-full bg-lenmed-blue/20 flex items-center justify-center">
                <span class="text-lenmed-blue font-medium text-xs">
                  {{ user?.email?.charAt(0).toUpperCase() }}
                </span>
              </div>
              <span class="max-w-[150px] truncate">{{ user?.email }}</span>
            </div>
            <button
              @click="handleSignOut"
              class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut :size="18" />
              <span class="hidden sm:inline">Sign Out</span>
            </button>

            <!-- Mobile Menu Button -->
            <button
              @click="mobileMenuOpen = !mobileMenuOpen"
              class="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu v-if="!mobileMenuOpen" :size="24" />
              <X v-else :size="24" />
            </button>
          </div>
        </div>

        <!-- Mobile Navigation -->
        <div
          v-show="mobileMenuOpen"
          class="md:hidden border-t border-gray-100 py-3"
        >
          <nav class="flex flex-col gap-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                route.path === item.path
                  ? 'bg-lenmed-navy text-white'
                  : 'text-lenmed-grey hover:bg-gray-100'
              ]"
            >
              <component :is="item.icon" :size="20" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <slot />
    </main>
  </div>

  <!-- Auth pages (no layout) -->
  <div v-else>
    <slot />
  </div>
</template>
