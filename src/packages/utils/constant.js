/**
 * Display range from start/end Dates (year only).
 * Pass null/undefined endDate for "Present".
 */
export const formatDateRange = (startDate, endDate) => {
    const start = startDate.getFullYear();
    if (!endDate) return `${start} — Present`;
    const end = endDate.getFullYear();
    return start === end ? `${start}` : `${start} — ${end}`;
};

export const aboutEducation = [
    {
        role: 'B.Tech, Computer Science',
        org: 'NIT Calicut',
        startDate: new Date(2018, 0, 1),
        endDate: new Date(2022, 0, 1),
        detail: 'Grade: 8.22',
        highlights: [
            'Joint Secretary for IEEE 2021',
            'Joint Secretary for CSEA 2022',
            'Tech Consultant for IEEE 2022',
            'Head of Design for Ragam and Tathva 2020–2022',
        ],
    },
]

export const aboutExperience = [
    {
        role: 'Software Engineer',
        org: 'Cisco Systems',
        startDate: new Date(2022, 0, 1),
        endDate: null, // Present
        detail:
            'At Cisco, I build front-end features for Webex Contact Center across login, agent workflows, and supervisor tools. I led the new WebEx login flow and Response Guard architecture, validating complex responses in real time and surfacing failures on Grafana. I earned the MVP Award for Best Innovation for an Agent Burnout POC and helped ship a related custom widget. Other work includes Microsoft Teams agent-state sync, Change Agent State for supervisors, multi-consult for multi-party conferences, and automation pipeline support. I also improved UI and accessibility (VoiceOver, JAWS), designed a paginated-list search that cuts API load via offline fallback, and built Grafana dashboards for TH client network KPIs.',
        highlights: [],
    },
    {
        role: 'Software Engineering Intern',
        org: 'SAP',
        startDate: new Date(2021, 0, 1),
        endDate: new Date(2021, 0, 1),
        detail: '2-month internship focused on automation testing and intern community events.',
        highlights: [
            'Worked on automation test cases using Selenium with Java as the main language.',
            'Served as an Execom member who conducted events for other interns who joined.',
        ],
    },
]

/**
 * Total professional experience in whole years, summed across roles.
 * Ongoing roles (`endDate: null`) use the current year as the end.
 */
export const getTotalExperienceYears = (experiences = aboutExperience) => {
    const currentYear = new Date().getFullYear();
    return experiences.reduce((sum, exp) => {
        const endYear = exp.endDate ? exp.endDate.getFullYear() : currentYear;
        return sum + Math.max(0, endYear - exp.startDate.getFullYear());
    }, 0);
};

/** Alias used by bio copy. */
export const getExp = () => getTotalExperienceYears();

export const ProfileCardInfo = {
    name: "Arjun Syam",
    title: "Software Engineer @ Cisco",
    email: "arjun.syam23@gmail.com",
    linkedIn: "https://www.linkedin.com/in/arjunsyam/",
    github: "https://github.com/Hu4k3n",
    instagram: "https://instagram.com/huraken.0w0",
    youtube: "https://youtube.com/Huraken",
}

/**
 * Condensed AskBar facts for SmolLM (~360M).
 * Plain sentences; put contact + work + school early.
 * Include ask-words: work, works, job, employer, school, college, email.
 * All facts are about Arjun Syam — pronouns in questions resolve to him via the system prompt.
 */
export const contentArray = [
    `Arjun Syam's email is ${ProfileCardInfo.email}.`,
  `Arjun Syam works at Cisco Systems.`,
    `Arjun is from Kerala, currently residing in Bangalore, India`,
    `His workplace and employer is Cisco Systems.`,
    `He works as a Software Engineer at Cisco on Webex Contact Center (since 2022).`,
    `Arjun has ${getExp()}+ years of experience as a Full Stack / Software Engineer.`,
    `Arjun went to school and college at NIT Calicut (National Institute of Technology Calicut).`,
    `Arjun graduated from NIT Calicut in 2022 with a B.Tech in Computer Science (GPA 8.22).`,
    `At NIT Calicut Arjun was IEEE and CSEA joint secretary, IEEE tech consultant, and Head of Design for Ragam and Tathva.`,
    `Arjun's stack is React, TypeScript, and JavaScript.`,
    `At Cisco Arjun led the Webex login flow, built Response Guard with Grafana alerts, and won MVP Best Innovation for Agent Burnout.`,
    `At Cisco Arjun also worked on Teams agent-state sync, Change Agent State, multi-party consult, accessibility (VoiceOver, JAWS), offline paginated search, and TH network KPI dashboards.`,
    `In 2021 Arjun interned at SAP doing Selenium/Java automation testing.`,
]

export const Buttons = {
    play: "Play",
    musicOn: "Music: On",
    musicOff: "Music: Off",
    resume: "See my Resume",
    exit: "Exit",
}

export const RESUME_URL = 'https://drive.google.com/drive/folders/1Hzh_gnoERSSKut7Guy8KzvXpOCws7o83?usp=sharing';
