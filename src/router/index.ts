import { createRouter, createWebHistory } from 'vue-router'
import WelcomePage from '@/pages/WelcomePage.vue'
import HomePage from '@/pages/HomePage.vue'
import CaseIntroPage from '@/pages/CaseIntroPage.vue'
import SceneExplorePage from '@/pages/SceneExplorePage.vue'
import DecisionPage from '@/pages/DecisionPage.vue'
import EndingPage from '@/pages/EndingPage.vue'
import ReviewPage from '@/pages/ReviewPage.vue'
import HotspotEditor from '@/pages/HotspotEditor.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/welcome'
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: WelcomePage
    },
    {
      path: '/archive',
      name: 'archive',
      component: HomePage
    },
    {
      path: '/case/:caseId/intro',
      name: 'case-intro',
      component: CaseIntroPage,
      props: true
    },
    {
      path: '/case/:caseId/scene/:sceneId',
      name: 'scene-explore',
      component: SceneExplorePage,
      props: true
    },
    {
      path: '/case/:caseId/decision/:decisionId',
      name: 'decision',
      component: DecisionPage,
      props: true
    },
    {
      path: '/case/:caseId/ending',
      name: 'ending',
      component: EndingPage,
      props: true
    },
    {
      path: '/case/:caseId/review',
      name: 'review',
      component: ReviewPage,
      props: true
    },
    {
      path: '/editor',
      name: 'editor',
      component: HotspotEditor
    }
  ]
})

export default router
