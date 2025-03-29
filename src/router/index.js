import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ContentView from '../views/ContentView.vue';
import FaeEcosystemView from '../views/FaeEcosystemView.vue';
import TransactionView from '../views/TransactionView.vue';
import InvestmentView from '../views/InvestmentView.vue';
import AchievementsView from '../views/AchievementsView.vue';
import RewardsView from '../views/RewardsView.vue';
import MetricsView from '@/views/MetricsView.vue';
import TranscendentalDjView from '@/views/TranscendentalDjView.vue';
import RerunView from '@/views/RerunView.vue';
import BlockchainRealmView from '@/views/BlockchainRealmView.vue';

const routes = [
    {
        path: '/',
        name: 'home',
        component: HomeView
    },
    {
        path: '/content/:id',
        name: 'content-view',
        component: ContentView,
        props: true
    },
    {
        path: '/fae-ecosystem',
        name: 'fae-ecosystem',
        component: FaeEcosystemView
    },
    {
        path: '/transactions',
        name: 'transactions',
        component: TransactionView
    },
    {
        path: '/about',
        name: 'about',
        component: () => import('@/views/AboutView.vue')
    },
    {
        path: '/attribution',
        name: 'attribution',
        component: () => import('@/views/AttributionView.vue')
    },
    {
        path: '/license',
        name: 'license',
        component: () => import('@/views/LicenseView.vue')
    },
    {
        path: '/score',
        name: 'score',
        component: () => import('@/views/ScoreView.vue')
    },
    {
        path: '/docs/comic',
        name: 'comic',
        component: () => import('@/views/docs/ComicView.vue')
    },
    {
        path: '/simulator',
        name: 'simulator',
        component: () => import(/* webpackChunkName: "simulator" */ '../views/SimulatorView.vue'),
        meta: {
            requiresAuth: false,
            title: 'Web3 Simulator',
            isDevTool: true
        }
    },
    {
        path: '/investments',
        name: 'investments',
        component: InvestmentView
    },
    {
        path: '/achievements',
        name: 'achievements',
        component: AchievementsView
    },
    {
        path: '/rewards',
        name: 'rewards',
        component: RewardsView
    },
    {
        path: '/profile',
        name: 'profile',
        component: () => import(/* webpackChunkName: "profile" */ '../views/ProfileView.vue'),
        meta: {
            requiresAuth: true,
        }
    },
    {
        path: '/metrics',
        name: 'metrics',
        component: MetricsView,
        meta: {
            requiresAuth: true,
            title: 'Performance Metrics'
        }
    },
    {
        path: '/transcendental-dj',
        name: 'transcendental-dj',
        component: TranscendentalDjView,
        meta: {
            requiresAuth: false,
            title: 'Transcendental EDM.DJ'
        }
    },
    {
        path: '/dj/:id',
        name: 'dj-profile',
        component: () => import('@/views/DjProfileView.vue'),
        meta: {
            requiresAuth: false,
            title: 'DJ Profile'
        }
    },
    {
        path: '/dj/:id/live',
        name: 'dj-live-session',
        component: () => import('@/views/LiveSessionView.vue'),
        meta: {
            requiresAuth: false,
            title: 'Live DJ Session'
        }
    },
    {
        path: '/certificate/verify',
        name: 'CertificateVerify',
        component: () => import('@/views/CertificateVerifyView.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/certificate/verify/:id',
        name: 'CertificateVerifyWithId',
        component: () => import('@/views/CertificateVerifyView.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/buffs',
        name: 'Buffs',
        component: () => import('@/views/BuffsView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/buffs/:id',
        name: 'BuffDetail',
        component: () => import('@/views/BuffDetailView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/rerun',
        name: 'Rerun',
        component: RerunView,
        meta: { 
            title: 'Transaction Rerun Analysis',
            requiresAuth: true
        }
    },
    {
        path: '/blockchain-realm',
        name: 'BlockchainRealm',
        component: BlockchainRealmView,
        meta: {
            title: 'Blockchain Realm Explorer'
        }
    }
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
});

export default router;