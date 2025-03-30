import { RouteRecordRaw } from 'vue-router';

const supportRoutes: Array<RouteRecordRaw> = [
  {
    path: '/support',
    name: 'Support',
    component: () => import(/* webpackChunkName: "support" */ '../views/Support.vue'),
    meta: {
      title: 'Support - Web3 Crypto Streaming',
      requiresAuth: false
    }
  },
  {
    path: '/support/contact',
    name: 'Contact',
    component: () => import(/* webpackChunkName: "contact" */ '../views/TabNineContact.vue'),
    meta: {
      title: 'Contact Us - Web3 Crypto Streaming',
      requiresAuth: false
    }
  }
];

export default supportRoutes;
