<script setup lang="ts">
definePageMeta({
  layout: false
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

// Redirect if already logged in
watchEffect(() => {
  if (user.value) {
    navigateTo('/')
  }
})

const handleSubmit = async () => {
  error.value = ''
  loading.value = true

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (authError) {
    error.value = authError.message
    loading.value = false
  } else {
    navigateTo('/')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-lenmed-navy">Lenmed</h1>
          <p class="text-lenmed-grey mt-2">Doctor & Hospital Management</p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="error" class="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {{ error }}
          </div>

          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Email</label>
            <input
              v-model="email"
              type="email"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Password</label>
            <input
              v-model="password"
              type="password"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              placeholder="Your password"
              required
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-lenmed-navy text-white py-2 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <p class="text-center mt-6 text-lenmed-grey text-sm">
          Don't have an account?
          <NuxtLink to="/signup" class="text-lenmed-blue hover:underline">Sign up</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
