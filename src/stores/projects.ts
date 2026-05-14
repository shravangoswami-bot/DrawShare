import { defineStore } from "pinia";
import { storage } from "@/adapters/storage/indexedDB";
import { newId } from "@/core/ids";
import type { Page, Project } from "@/core/types";

const A4_PORTRAIT = { width: 1240, height: 1754 };

export const useProjectsStore = defineStore("projects", {
  state: () => ({
    projects: [] as Project[],
    loaded: false,
  }),
  actions: {
    async load() {
      this.projects = await storage.listProjects();
      this.loaded = true;
    },
    async create(name: string): Promise<Project> {
      const now = Date.now();
      const pageId = newId();
      const project: Project = {
        id: newId(),
        name: name.trim() || "Untitled",
        createdAt: now,
        updatedAt: now,
        pageOrder: [pageId],
      };
      const page: Page = {
        id: pageId,
        projectId: project.id,
        index: 0,
        name: "Page 1",
        width: A4_PORTRAIT.width,
        height: A4_PORTRAIT.height,
        background: "blank",
        createdAt: now,
        updatedAt: now,
      };
      await storage.putProject(project);
      await storage.putPage(page);
      this.projects = [project, ...this.projects];
      return project;
    },
    async rename(id: string, name: string) {
      const p = this.projects.find((x) => x.id === id);
      if (!p) return;
      p.name = name.trim() || p.name;
      p.updatedAt = Date.now();
      await storage.putProject({ ...p });
    },
    async remove(id: string) {
      await storage.deleteProject(id);
      this.projects = this.projects.filter((p) => p.id !== id);
    },
    async touch(id: string) {
      const p = this.projects.find((x) => x.id === id);
      if (!p) return;
      p.updatedAt = Date.now();
      await storage.putProject({ ...p });
      this.projects = [...this.projects].sort((a, b) => b.updatedAt - a.updatedAt);
    },
  },
});

export const DEFAULT_PAGE_SIZE = A4_PORTRAIT;
