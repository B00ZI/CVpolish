import type { Job } from "@/lib/types";
import { mockProfile, mockCvFr } from "./profile";

// FAKE job descriptions + analyses for the mock phase.
// Each job freezes its own CV copy (cv) like a real job would —
// edits inside the workspace land there, not on the shared profile.
// cvFr = a French translated copy (what POST .../translate would save).

const northboundJd = `Frontend Developer (React / Next.js) — Remote

We're Northbound Labs, a 20-person SaaS company building analytics tools for logistics teams. We're looking for a Frontend Developer with 3+ years of experience to own major product surfaces.

What you'll do:
- Build and maintain product features in React, TypeScript, and Next.js
- Style interfaces with Tailwind CSS and maintain our Storybook component library
- Consume REST and GraphQL APIs and keep data flows predictable
- Write automated tests with Jest and Playwright
- Improve performance and accessibility (WCAG 2.1) across the app
- Ship continuously through our CI/CD pipeline on AWS

What we expect:
- Solid TypeScript and React experience in production
- Eye for detail on UI, spacing, and edge cases
- Experience with Agile teams and code review culture
- Good communication in English`;

const medilinkJd = `Développeur Full-Stack — Hybride, Casablanca

MediLink développe des plateformes de prise de rendez-vous pour des cliniques partout au Maroc. Vous travaillerez sur notre frontend Next.js et notre backend FastAPI.

Exigences :
- 2+ ans d'expérience avec React / Next.js et Node.js ou Python
- Conception de schémas PostgreSQL et optimisation de requêtes
- Déploiements basés sur Docker et CI/CD
- Conception d'API REST, authentification (OAuth2 / JWT)
- Une expérience dans la santé ou un domaine régulé est un plus`;

export const mockJobs: Job[] = [
  {
    id: "job-northbound",
    language: "en",
    title: "Frontend Developer",
    company: "Northbound Labs",
    description: northboundJd,
    createdAt: "2026-10-27T09:30:00.000Z",
    cv: mockProfile,
    cvFr: null,
    analysis: {
      score: 76,
      matched: [
        "React",
        "TypeScript",
        "Next.js",
        "Tailwind CSS",
        "Node.js",
        "REST APIs",
        "PostgreSQL",
        "Docker",
        "GitHub Actions",
        "CI/CD",
        "Git",
        "Agile",
        "Performance optimization",
      ],
      missing: ["GraphQL", "Jest", "Playwright", "Storybook"],
      notes: {
        GraphQL:
          "Used GraphQL in my final-year capstone to merge 3 public APIs into one dashboard",
      },
      added: ["Storybook"],
    },
    aiUsed: false, // mock phase: no AI ran — honest until the backend wires Gemini
  },
  {
    id: "job-medilink",
    language: "fr", // French copy exists and is the active version on open
    title: "Développeur Full-Stack",
    company: "MediLink",
    description: medilinkJd,
    createdAt: "2026-10-24T14:00:00.000Z",
    cv: mockProfile, // source stays English
    cvFr: mockCvFr, // the translated copy, as POST .../translate would save it
    analysis: {
      score: 91,
      matched: [
        "React",
        "Next.js",
        "Node.js",
        "Python",
        "FastAPI",
        "PostgreSQL",
        "Docker",
        "CI/CD",
        "API REST",
        "TypeScript",
        "Optimisation des performances",
      ],
      missing: ["OAuth2 / JWT", "Domaine de la santé"],
      notes: {
        "OAuth2 / JWT":
          "Implémenté l'authentification JWT dans DevRadar avec rotation des refresh tokens",
      },
      added: [],
    },
    aiUsed: false, // mock phase: no AI ran — honest until the backend wires Gemini
  },
];
