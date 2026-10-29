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
