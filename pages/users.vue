<script setup lang="ts">
import { Plus, Trash2, X, Users, Shield, Mail, Clock, User } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const currentUser = useSupabaseUser()

interface UserProfile {
  id: string
  user_id: string
  email: string
  display_name: string | null
  role: string
  created_at: string
  created_by: string | null
}

const users = ref<UserProfile[]>([])
const loading = ref(true)
const showModal = ref(false)
const showInviteModal = ref(false)

const formData = ref({
  email: '',
  password: '',
  display_name: '',
  role: 'user'
})

const inviteEmail = ref('')
const inviteRole = ref('user')

// Format date to South African time
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

const fetchUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    users.value = data || []
  } catch (error) {
    console.error('Error fetching users:', error)
  } finally {
    loading.value = false
  }
}

const handleCreateUser = async () => {
  if (!formData.value.email || !formData.value.password) {
    alert('Please fill in email and password')
    return
  }

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: formData.value.email,
      password: formData.value.password,
      email_confirm: true
    })

    if (authError) {
      // Try regular signup if admin API not available
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: formData.value.email,
        password: formData.value.password
      })

      if (signupError) throw signupError

      // Create profile
      if (signupData.user) {
        await supabase.from('user_profiles').insert({
          user_id: signupData.user.id,
          email: formData.value.email,
          display_name: formData.value.display_name || null,
          role: formData.value.role,
          created_by: currentUser.value?.email || 'unknown'
        })
      }
    } else if (authData.user) {
      // Create profile for admin-created user
      await supabase.from('user_profiles').insert({
        user_id: authData.user.id,
        email: formData.value.email,
        display_name: formData.value.display_name || null,
        role: formData.value.role,
        created_by: currentUser.value?.email || 'unknown'
      })
    }

    showModal.value = false
    formData.value = { email: '', password: '', display_name: '', role: 'user' }
    fetchUsers()
    alert('User created successfully! They can now log in.')
  } catch (error: any) {
    console.error('Error creating user:', error)
    alert('Error creating user: ' + error.message)
  }
}

const handleInviteUser = async () => {
  if (!inviteEmail.value) {
    alert('Please enter an email address')
    return
  }

  try {
    // Send magic link / invite
    const { error } = await supabase.auth.signInWithOtp({
      email: inviteEmail.value,
      options: {
        shouldCreateUser: true
      }
    })

    if (error) throw error

    // Pre-create profile
    await supabase.from('user_profiles').insert({
      user_id: null, // Will be updated when user confirms
      email: inviteEmail.value,
      role: inviteRole.value,
      created_by: currentUser.value?.email || 'unknown'
    })

    showInviteModal.value = false
    inviteEmail.value = ''
    inviteRole.value = 'user'
    fetchUsers()
    alert('Invite sent! The user will receive an email to set up their account.')
  } catch (error: any) {
    console.error('Error inviting user:', error)
    alert('Error inviting user: ' + error.message)
  }
}

const handleUpdateRole = async (userId: string, newRole: string) => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) throw error
    fetchUsers()
  } catch (error: any) {
    console.error('Error updating role:', error)
    alert('Error updating role: ' + error.message)
  }
}

const handleDeleteUser = async (userId: string, email: string) => {
  if (email === currentUser.value?.email) {
    alert('You cannot delete your own account')
    return
  }

  if (!confirm(`Are you sure you want to remove ${email}?`)) return

  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (error) throw error
    fetchUsers()
  } catch (error: any) {
    console.error('Error deleting user:', error)
    alert('Error deleting user: ' + error.message)
  }
}

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin': return { bg: 'bg-purple-100', text: 'text-purple-700', icon: Shield }
    case 'user': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: User }
    case 'viewer': return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Users }
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: User }
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-lenmed-navy">User Management</h1>
      <div class="flex gap-2">
        <button
          @click="showInviteModal = true"
          class="flex items-center gap-2 bg-white border border-lenmed-blue text-lenmed-blue px-4 py-2 rounded-lg hover:bg-lenmed-blue/5 transition-colors"
        >
          <Mail :size="20" />
          Invite User
        </button>
        <button
          @click="showModal = true"
          class="flex items-center gap-2 bg-lenmed-blue text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
        >
          <Plus :size="20" />
          Add User
        </button>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-lenmed-grey">Loading...</div>
      <div v-else-if="users.length === 0" class="p-8 text-center text-lenmed-grey">
        No users found. Add your first user!
      </div>
      <table v-else class="w-full">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">User</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Role</th>
            <th class="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Added</th>
            <th class="text-right px-6 py-3 text-sm font-medium text-lenmed-grey">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-lenmed-blue/20 flex items-center justify-center">
                  <span class="text-lenmed-blue font-medium">
                    {{ user.email.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <p class="font-medium text-lenmed-navy">{{ user.display_name || user.email }}</p>
                  <p v-if="user.display_name" class="text-sm text-gray-500">{{ user.email }}</p>
                  <p v-if="user.email === currentUser?.email" class="text-xs text-lenmed-blue">(You)</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <select
                :value="user.role"
                @change="handleUpdateRole(user.id, ($event.target as HTMLSelectElement).value)"
                :disabled="user.email === currentUser?.email"
                :class="[
                  'px-3 py-1 rounded-lg text-sm font-medium border-0 cursor-pointer',
                  getRoleBadge(user.role).bg,
                  getRoleBadge(user.role).text,
                  user.email === currentUser?.email ? 'opacity-50 cursor-not-allowed' : ''
                ]"
              >
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="viewer">Viewer</option>
              </select>
            </td>
            <td class="px-6 py-4 text-sm text-lenmed-grey">
              <div class="flex items-center gap-1">
                <Clock :size="14" />
                {{ formatSATime(user.created_at) }}
              </div>
              <div v-if="user.created_by" class="text-xs text-gray-400 mt-1">
                By: {{ user.created_by }}
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end">
                <button
                  v-if="user.email !== currentUser?.email"
                  @click="handleDeleteUser(user.id, user.email)"
                  class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove user"
                >
                  <Trash2 :size="18" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add User Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold text-lenmed-navy">Add New User</h2>
          <button @click="showModal = false" class="p-1 hover:bg-gray-100 rounded">
            <X :size="20" />
          </button>
        </div>
        <form @submit.prevent="handleCreateUser" class="p-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Email *</label>
            <input
              v-model="formData.email"
              type="email"
              placeholder="user@example.com"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Password *</label>
            <input
              v-model="formData.password"
              type="password"
              placeholder="Minimum 6 characters"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
              required
              minlength="6"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Display Name</label>
            <input
              v-model="formData.display_name"
              type="text"
              placeholder="Optional"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Role</label>
            <select
              v-model="formData.role"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            >
              <option value="admin">Admin - Full access</option>
              <option value="user">User - Can edit doctors</option>
              <option value="viewer">Viewer - Read only</option>
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
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Invite User Modal -->
    <div v-if="showInviteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold text-lenmed-navy">Invite User via Email</h2>
          <button @click="showInviteModal = false" class="p-1 hover:bg-gray-100 rounded">
            <X :size="20" />
          </button>
        </div>
        <div class="p-4 space-y-4">
          <p class="text-sm text-gray-600">
            Send an invite email. The user will receive a link to set up their account.
          </p>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Email Address *</label>
            <input
              v-model="inviteEmail"
              type="email"
              placeholder="user@example.com"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-lenmed-grey mb-1">Role</label>
            <select
              v-model="inviteRole"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
            >
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="showInviteModal = false"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleInviteUser"
              class="flex-1 bg-lenmed-blue text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Send Invite
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
