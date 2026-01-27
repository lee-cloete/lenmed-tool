export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  if (!user.value && to.path !== '/login' && to.path !== '/signup') {
    return navigateTo('/login')
  }

  if (user.value && (to.path === '/login' || to.path === '/signup')) {
    return navigateTo('/')
  }
})
