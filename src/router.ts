import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "projects",
    component: () => import("./views/ProjectsView.vue"),
  },
  {
    path: "/p/:id",
    name: "editor",
    component: () => import("./views/EditorView.vue"),
    props: true,
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
