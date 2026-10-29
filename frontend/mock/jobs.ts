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

const medilinkJd = `Full-Stack Developer — Hybrid, Casablanca

MediLink builds appointment platforms for clinics across Morocco. You'll work across our Next.js frontend and FastAPI backend.

Requirements:
- 2+ years with React / Next.js and Node.js or Python
- PostgreSQL schema design and query optimization
- Docker-based deployments and CI/CD
- REST API design, authentication (OAuth2 / JWT)
- Experience in healthcare or regulated domains is a plus`;

export const mockJobs: Job[] = [
  {
    id: "job-northbound",
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
    title: "Full-Stack Developer",
    company: "MediLink",
    location: "Casablanca, Morocco (hybrid)",
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
        "REST APIs",
        "TypeScript",
        "Performance optimization",
      ],
      missing: ["OAuth2 / JWT", "Healthcare domain"],
      notes: {
        "OAuth2 / JWT":
          "Implemented JWT auth in DevRadar with refresh-token rotation",
      },
      added: [],
    },
    rewrites: [],
    tailored: {
      summary:
        "Full-stack developer with 3 years shipping Next.js frontends and FastAPI backends, experienced with PostgreSQL optimization, Docker, and JWT-secured REST APIs. At Atlas Digital I cut API response times by 40% and halved deploy times with CI/CD. I bring that same care for reliability and speed to platforms where correctness matters — like clinic appointment flows.",
      experience: [
        {
          id: "exp-atlas",
          jobTitle: "Full-Stack Developer",
          company: "Atlas Digital",
          location: "Casablanca, Morocco",
          startDate: "Feb 2023",
          endDate: null,
          bullets: [
            "Built and maintained Next.js product surfaces and FastAPI endpoints serving 1,200+ monthly users",
            "Optimized PostgreSQL queries and added Redis caching, cutting API response time by 40% (900 ms → 540 ms)",
            "Containerized services with Docker and automated releases through GitHub Actions CI/CD, halving deploy time",
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
            "Rebuilt 12 legacy pages in React, improving Lighthouse performance from 54 to 91",
            "Integrated Stripe checkout that processed the first 500 paid orders within 3 months",
          ],
        },
      ],
      projects: [
        {
          id: "prj-devradar",
          name: "DevRadar",
          description:
            "Weekly repo-health digest emailed to engineering teams: open PRs, review latency, commit churn.",
          techStack: ["Python", "FastAPI", "PostgreSQL", "GitHub API"],
          links: [
            { label: "GitHub", url: "github.com/karim-alaoui/devradar" },
          ],
          bullets: [
            "Runs scheduled jobs for 40+ repositories with a 99.5% on-time delivery rate",
            "JWT-secured API with refresh-token rotation for team dashboards",
          ],
        },
      ],
      generatedAt: "2026-10-24T14:20:00.000Z",
    },
  },
];
