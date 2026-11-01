import type { Job } from "@/lib/types";

// FAKE job descriptions + analyses for the mock phase.

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
    location: "Remote",
    description: northboundJd,
    createdAt: "2026-10-27T09:30:00.000Z",
    status: "analyzed",
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
    rewrites: [
      {
        id: "rw-summary",
        section: "summary",
        refId: "",
        original:
          "Full-stack developer with 3 years of experience shipping web apps with React, TypeScript, and Node.js. I turn rough product ideas into fast, maintainable features — most recently cutting API response times by 40% and halving deploy times with a GitHub Actions pipeline. Looking to bring strong product sense and clean code to a remote-first product team.",
        rewritten:
          "Frontend-focused developer with 3 years of production React, TypeScript, and Next.js experience. I ship fast, accessible product surfaces — recently cutting API response times by 40% and raising Lighthouse scores from 54 to 91 — and I thrive in Agile teams with strong code-review culture. Excited to own major product surfaces for a remote-first SaaS team.",
        accepted: null,
      },
      {
        id: "rw-exp1",
        section: "experience",
        refId: "exp-atlas",
        original:
          "Optimized SQL queries and added Redis caching, cutting average API response time from 900 ms to 540 ms (−40%)",
        rewritten:
          "Cut frontend-facing API latency by 40% (900 ms → 540 ms) by optimizing SQL queries and adding Redis caching, keeping LCP under 2.5 s on the main dashboard",
        accepted: null,
      },
      {
        id: "rw-exp2",
        section: "experience",
        refId: "exp-atlas",
        original:
          "Shipped a customer dashboard used by 1,200+ monthly users, raising task completion rate by 28%",
        rewritten:
          "Shipped a React + TypeScript customer dashboard for 1,200+ monthly users, raising task completion rate by 28% through rebuilt flows and accessible (WCAG-minded) components",
        accepted: null,
      },
      {
        id: "rw-exp3",
        section: "experience",
        refId: "exp-greentech",
        original:
          "Rebuilt 12 legacy jQuery pages in React, improving Lighthouse performance from 54 to 91",
        rewritten:
          "Rebuilt 12 legacy jQuery pages in React + TypeScript, improving Lighthouse performance from 54 to 91 and passing WCAG contrast checks on all rebuilt screens",
        accepted: null,
      },
      {
        id: "rw-prj1",
        section: "projects",
        refId: "prj-shipment",
        original:
          "Processes 5,000+ shipment events/day with WebSocket live updates",
        rewritten:
          "Built a Next.js + TypeScript real-time UI handling 5,000+ shipment events/day over WebSockets, with Storybook-documented reusable chart and alert components",
        accepted: null,
      },
    ],
    tailored: null,
  },
  {
    id: "job-medilink",
    language: "fr",
    title: "Développeur Full-Stack",
    company: "MediLink",
    location: "Casablanca, Maroc (hybride)",
    description: medilinkJd,
    createdAt: "2026-10-24T14:00:00.000Z",
    status: "tailed",
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
    rewrites: [],
    tailored: {
      summary:
        "Développeur full-stack avec 3 ans d'expérience sur des frontends Next.js et des backends FastAPI, à l'aise avec l'optimisation PostgreSQL, Docker et les API REST sécurisées par JWT. Chez Atlas Digital, j'ai réduit les temps de réponse API de 40 % et divisé par deux les temps de déploiement avec le CI/CD. J'apporte ce même souci de fiabilité et de rapidité aux plateformes où l'exactitude compte — comme les parcours de prise de rendez-vous en clinique.",
      experience: [
        {
          id: "exp-atlas",
          jobTitle: "Développeur Full-Stack",
          company: "Atlas Digital",
          location: "Casablanca, Maroc",
          startDate: "févr. 2023",
          endDate: null,
          bullets: [
            "Construit et maintenu des surfaces produit Next.js et des endpoints FastAPI pour plus de 1 200 utilisateurs mensuels",
            "Optimisé les requêtes PostgreSQL et ajouté un cache Redis, réduisant le temps de réponse API de 40 % (900 ms → 540 ms)",
            "Conteneurisé les services avec Docker et automatisé les releases via CI/CD GitHub Actions, divisant le temps de déploiement par deux",
          ],
        },
        {
          id: "exp-greentech",
          jobTitle: "Développeur Frontend (stagiaire)",
          company: "GreenTech Solutions",
          location: "Rabat, Maroc",
          startDate: "juin 2022",
          endDate: "sept. 2022",
          bullets: [
            "Reconstruit 12 pages historiques en React, améliorant le score Lighthouse de 54 à 91",
            "Intégré le paiement Stripe, qui a traité les 500 premières commandes payées en 3 mois",
          ],
        },
      ],
      projects: [
        {
          id: "prj-devradar",
          name: "DevRadar",
          description:
            "Synthèse hebdomadaire de l'état des dépôts envoyée par e-mail aux équipes : PR ouverts, latence de review, fréquence de commits.",
          techStack: ["Python", "FastAPI", "PostgreSQL", "API GitHub"],
          links: [
            { label: "GitHub", url: "github.com/karim-alaoui/devradar" },
          ],
          bullets: [
            "Exécute des tâches planifiées pour plus de 40 dépôts avec un taux de ponctualité de 99,5 %",
            "API sécurisée par JWT avec rotation des refresh tokens pour les tableaux de bord d'équipe",
          ],
        },
      ],
      generatedAt: "2026-10-24T14:20:00.000Z",
    },
  },
];
