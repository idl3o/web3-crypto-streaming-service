import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '@/views/Home.vue'
import Dashboard from '@/views/Dashboard.vue'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'home',
        component: Home
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: Dashboard
    },
    // Streamlined content browsing route
    {
        path: '/browse',
        name: 'content-browse',
        component: () => import('../views/ContentBrowse.vue')
    },
    // Direct content viewing route
    {
        path: '/content/:id',
        name: 'content-view',
        component: () => import('../views/ContentView.vue')
    },
    // Quick access to content creation
    {
        path: '/create',
        name: 'content-create',
        component: () => import('../views/ContentCreate.vue'),
        meta: { requiresAuth: true }
    },
    // Content management for creators
    {
        path: '/manage',
        name: 'content-manage',
        component: () => import('../views/ContentManage.vue'),
        meta: { requiresAuth: true }
    },
    // Analytics for content performance
    {
        path: '/analytics',
        name: 'analytics',
        component: () => import('../views/Analytics.vue'),
        meta: { requiresAuth: true }
    },
    // User settings
    {
        path: '/settings',
        name: 'settings',
        component: () => import('../views/Settings.vue'),
        meta: { requiresAuth: true }
    },
    // Company/platform information
    {
        path: '/about',
        name: 'about',
        component: () => import('../views/About.vue')
    },
    // Vision page
    {
        path: '/vision',
        name: 'vision',
        component: () => import('../views/Vision.vue')
    },
    // Route for verifying PoE on the blockchain
    {
        path: '/verify/:hash',
        name: 'verify-poe',
        component: () => import('../views/VerifyPoE.vue')
    },
    // Not found page
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('../views/NotFound.vue')
    }
]

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { top: 0 }
        }
    }
})

// Navigation guard for routes that require authentication
router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
    const walletStore = window.$pinia?.state.value?.wallet
    const isAuthenticated = walletStore?.isConnected || false

    if (requiresAuth && !isAuthenticated) {
        // Store the intended destination to redirect after login
        next({
            name: 'home',
            query: { redirect: to.fullPath, authRequired: 'true' }
        })
    } else {
        next()
    }
})

export default router