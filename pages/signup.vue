<script setup lang="ts">
definePageMeta({
  layout: false
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const success = ref(false)

// Redirect if already logged in
watchEffect(() => {
  if (user.value) {
    navigateTo('/')
  }
})

const handleSubmit = async () => {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  loading.value = true

  const { error: authError } = await supabase.auth.signUp({
    email: email.value,
    password: password.value
  })

  if (authError) {
    error.value = authError.message
    loading.value = false
  } else {
    success.value = true
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Success State -->
      <div v-if="success" class="bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="w-16 h-16 bg-lenmed-green rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-lenmed-navy mb-2">Check your email</h2>
        <p class="text-lenmed-grey mb-6">We've sent a confirmation link to {{ email }}</p>
        <NuxtLink to="/login" class="text-lenmed-blue hover:underline">Back to login</NuxtLink>
      </div>

      <!-- Signup Form -->
      <div v-else class="bg-white rounded-lg shadow-lg p-8">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-lenmed-navy">Lenmed</h1>
          <p class="text-lenmed-grey mt-2">Create your account</p>
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
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Confirm Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              placeholder="Confirm your password"
              required
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-lenmed-navy text-white py-2 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {{ loading ? 'Creating account...' : 'Sign Up' }}
          </button>
        </form>

        <p class="text-center mt-6 text-lenmed-grey text-sm">
          Already have an account?
          <NuxtLink to="/login" class="text-lenmed-blue hover:underline">Sign in</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
