export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/signup']

  // If not logged in and trying to access protected route, redirect to login
  if (!user.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  // If logged in and trying to access login/signup, redirect to dashboard
  if (user.value && publicRoutes.includes(to.path)) {
    return navigateTo('/')
  }
})
