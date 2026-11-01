import type { MasterProfile } from "@/lib/types";

// FAKE data for the mock phase — a realistic junior/mid full-stack profile.
// Everything here follows the tech-CV structure from AGENTS.md.

export const mockProfile: MasterProfile = {
  contact: {
    fullName: "Karim Alaoui",
    targetTitle: "Full-Stack Developer",
    phone: "+212 6 12 34 56 78",
    email: "karim.alaoui.dev@proton.me",
    city: "Casablanca, Morocco",
    github: "github.com/karim-alaoui",
    linkedin: "linkedin.com/in/karim-alaoui",
    portfolio: "karimalaoui.dev",
  },
  summary:
    "Full-stack developer with 3 years of experience shipping web apps with React, TypeScript, and Node.js. I turn rough product ideas into fast, maintainable features — most recently cutting API response times by 40% and halving deploy times with a GitHub Actions pipeline. Looking to bring strong product sense and clean code to a remote-first product team.",
  skillGroups: [
    {
      id: "sg-langs",
      category: "Languages",
      skills: ["TypeScript", "JavaScript", "Python", "SQL", "HTML5 / CSS3"],
    },
    {
      id: "sg-frameworks",
      category: "Frameworks & Libraries",
      skills: ["React", "Next.js", "Node.js", "Express", "FastAPI", "Tailwind CSS"],
    },
    {
      id: "sg-databases",
      category: "Databases",
      skills: ["PostgreSQL", "MongoDB", "Redis"],
    },
    {
      id: "sg-cloud",
      category: "Cloud & DevOps",
      skills: ["Docker", "GitHub Actions", "CI/CD", "AWS (EC2, S3)", "Linux"],
    },
    {
      id: "sg-tools",
      category: "Tools",
      skills: ["Git", "Postman", "Figma", "Jira"],
    },
  ],
  experience: [
    {
      id: "exp-atlas",
      jobTitle: "Full-Stack Developer",
      company: "Atlas Digital",
      location: "Casablanca, Morocco",
      startDate: "Feb 2023",
      endDate: null,
      bullets: [
        "Optimized SQL queries and added Redis caching, cutting average API response time from 900 ms to 540 ms (−40%)",
        "Built a CI/CD pipeline with GitHub Actions and Docker, halving deployment time from 25 to 12 minutes",
        "Shipped a customer dashboard used by 1,200+ monthly users, raising task completion rate by 28%",
        "Led the migration of a 40k-line jQuery codebase to React + TypeScript with zero downtime",
      ],
    },
    {
      id: "exp-greentech",
      jobTitle: "Frontend Developer Intern",
      company: "GreenTech Solutions",
      location: "Rabat, Morocco",
      startDate: "Jun 2022",
      endDate: "Sep 2022",
      bullets: [
        "Rebuilt 12 legacy jQuery pages in React, improving Lighthouse performance from 54 to 91",
        "Integrated Stripe checkout that processed the first 500 paid orders within 3 months",
      ],
    },
  ],
  projects: [
    {
      id: "prj-shipment",
      name: "ShipmentTrack",
      description:
        "Real-time shipment dashboard for small carriers: live map, delay alerts, and CSV/Excel report exports.",
      techStack: ["Next.js", "TypeScript", "PostgreSQL", "Socket.IO", "Docker"],
      links: [
        { label: "Live", url: "https://shipmenttrack.app" },
        { label: "GitHub", url: "github.com/karim-alaoui/shipmenttrack" },
      ],
      bullets: [
        "Processes 5,000+ shipment events/day with WebSocket live updates",
        "Cut initial page load to 1.2 s with route-level code splitting",
      ],
    },
    {
      id: "prj-devradar",
      name: "DevRadar",
      description:
        "Weekly repo-health digest emailed to engineering teams: open PRs, review latency, commit churn.",
      techStack: ["Python", "FastAPI", "PostgreSQL", "GitHub API"],
      links: [{ label: "GitHub", url: "github.com/karim-alaoui/devradar" }],
      bullets: [
        "Runs scheduled jobs for 40+ repositories with a 99.5% on-time delivery rate",
      ],
    },
    {
      id: "prj-souqlens",
      name: "SouqLens",
      description:
        "Price tracker for Moroccan e-commerce sites: historical charts and browser-extension alerts.",
      techStack: ["React", "Node.js", "MongoDB", "Puppeteer"],
      links: [
        { label: "Live", url: "https://souqlens.ma" },
        { label: "GitHub", url: "github.com/karim-alaoui/souqlens" },
      ],
      bullets: [
        "Tracks 300+ products across 5 stores, notifying users on price drops via email",
      ],
    },
  ],
  education: [
    {
      id: "edu-h2",
      degree: "BSc Computer Science",
      major: "Software Engineering",
      university: "Hassan II University",
      location: "Casablanca, Morocco",
      graduationYear: "2023",
      coursework: [
        "Data Structures & Algorithms",
        "Databases",
        "Operating Systems",
        "Web Engineering",
      ],
    },
  ],
  certifications: [
    {
      id: "cert-aws",
      name: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      year: "2024",
    },
  ],
  keywords: [
    "React",
    "TypeScript",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "Docker",
    "CI/CD",
    "REST APIs",
    "Tailwind CSS",
    "FastAPI",
    "Redis",
    "Git",
    "Performance optimization",
    "Agile",
  ],
  updatedAt: "2026-10-29T10:00:00.000Z",
};

// Same profile, fully in French — a separate "database" so a CV can be
// tailored in English or French. Same ids as the English mock, so
// anything referencing an experience/project id works for both.
export const mockProfileFr: MasterProfile = {
  contact: {
    fullName: "Karim Alaoui",
    targetTitle: "Développeur Full-Stack",
    phone: "+212 6 12 34 56 78",
    email: "karim.alaoui.dev@proton.me",
    city: "Casablanca, Maroc",
    github: "github.com/karim-alaoui",
    linkedin: "linkedin.com/in/karim-alaoui",
    portfolio: "karimalaoui.dev",
  },
  summary:
    "Développeur full-stack avec 3 ans d'expérience dans la création d'applications web avec React, TypeScript et Node.js. Je transforme des idées produits floues en fonctionnalités rapides et maintenables — j'ai récemment réduit les temps de réponse API de 40 % et divisé par deux les temps de déploiement grâce à un pipeline GitHub Actions. Je souhaite apporter un fort sens du produit et un code propre à une équipe produit remote-first.",
  skillGroups: [
    {
      id: "sg-langs",
      category: "Langages",
      skills: ["TypeScript", "JavaScript", "Python", "SQL", "HTML5 / CSS3"],
    },
    {
      id: "sg-frameworks",
      category: "Frameworks & bibliothèques",
      skills: ["React", "Next.js", "Node.js", "Express", "FastAPI", "Tailwind CSS"],
    },
    {
      id: "sg-databases",
      category: "Bases de données",
      skills: ["PostgreSQL", "MongoDB", "Redis"],
    },
    {
      id: "sg-cloud",
      category: "Cloud & DevOps",
      skills: ["Docker", "GitHub Actions", "CI/CD", "AWS (EC2, S3)", "Linux"],
    },
    {
      id: "sg-tools",
      category: "Outils",
      skills: ["Git", "Postman", "Figma", "Jira"],
    },
  ],
  experience: [
    {
      id: "exp-atlas",
      jobTitle: "Développeur Full-Stack",
      company: "Atlas Digital",
      location: "Casablanca, Maroc",
      startDate: "févr. 2023",
      endDate: null,
      bullets: [
        "Optimisé les requêtes SQL et ajouté un cache Redis, réduisant le temps de réponse API moyen de 900 ms à 540 ms (−40 %)",
        "Mis en place un pipeline CI/CD avec GitHub Actions et Docker, réduisant de moitié le temps de déploiement de 25 à 12 minutes",
        "Livré un tableau de bord client utilisé par plus de 1 200 utilisateurs mensuels, améliorant le taux de complétion des tâches de 28 %",
        "Piloté la migration d'une base de code jQuery de 40 000 lignes vers React + TypeScript sans interruption de service",
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
        "Reconstruit 12 pages jQuery historiques en React, améliorant le score Lighthouse de 54 à 91",
        "Intégré le paiement Stripe, qui a traité les 500 premières commandes payées en 3 mois",
      ],
    },
  ],
  projects: [
    {
      id: "prj-shipment",
      name: "ShipmentTrack",
      description:
        "Tableau de bord d'expéditions en temps réel pour petits transporteurs : carte en direct, alertes de retard et exports de rapports CSV/Excel.",
      techStack: ["Next.js", "TypeScript", "PostgreSQL", "Socket.IO", "Docker"],
      links: [
        { label: "Démo", url: "https://shipmenttrack.app" },
        { label: "GitHub", url: "github.com/karim-alaoui/shipmenttrack" },
      ],
      bullets: [
        "Traite plus de 5 000 événements d'expédition par jour avec des mises à jour WebSocket en direct",
        "Réduit le chargement initial de la page à 1,2 s grâce au découpage du code par route",
      ],
    },
    {
      id: "prj-devradar",
      name: "DevRadar",
      description:
        "Synthèse hebdomadaire de l'état des dépôts envoyée par e-mail aux équipes : PR ouverts, latence de review, fréquence de commits.",
      techStack: ["Python", "FastAPI", "PostgreSQL", "API GitHub"],
      links: [{ label: "GitHub", url: "github.com/karim-alaoui/devradar" }],
      bullets: [
        "Exécute des tâches planifiées pour plus de 40 dépôts avec un taux de ponctualité de 99,5 %",
      ],
    },
    {
      id: "prj-souqlens",
      name: "SouqLens",
      description:
        "Suivi de prix pour les sites e-commerce marocains : graphiques historiques et alertes via extension navigateur.",
      techStack: ["React", "Node.js", "MongoDB", "Puppeteer"],
      links: [
        { label: "Démo", url: "https://souqlens.ma" },
        { label: "GitHub", url: "github.com/karim-alaoui/souqlens" },
      ],
      bullets: [
        "Suit plus de 300 produits sur 5 boutiques, en notifiant les utilisateurs par e-mail en cas de baisse de prix",
      ],
    },
  ],
  education: [
    {
      id: "edu-h2",
      degree: "Licence d'informatique",
      major: "Génie logiciel",
      university: "Université Hassan II",
      location: "Casablanca, Maroc",
      graduationYear: "2023",
      coursework: [
        "Structures de données & algorithmes",
        "Bases de données",
        "Systèmes d'exploitation",
        "Ingénierie web",
      ],
    },
  ],
  certifications: [
    {
      id: "cert-aws",
      name: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      year: "2024",
    },
  ],
  keywords: [
    "React",
    "TypeScript",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "Docker",
    "CI/CD",
    "API REST",
    "Tailwind CSS",
    "FastAPI",
    "Redis",
    "Git",
    "Optimisation des performances",
    "Agile",
  ],
  updatedAt: "2026-10-29T10:00:00.000Z",
};

