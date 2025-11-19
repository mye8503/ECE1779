import { Callout, Steps } from "nextra/components";

# Course Project Guidelines

The course project is a central component of this course, accounting for **50%** of your final grade. It is a substantial, collaborative undertaking designed for teams of **2 to 4 students** to apply and expand upon concepts from lectures by building and deploying a **stateful cloud-native application**. This project emphasizes cloud and edge computing technologies covered in class, including containerization, orchestration, persistent storage, and monitoring.

## Project Deliverables

The course project consists of three major deliverables:

1. **Project Proposal** (due **Monday, October 20, 2025, 11:59 PM**): <span className="highlight-red-bold">15% of final grade</span>

   - A Markdown document outlining the project’s motivation, objectives, features, and tentative plan.

2. **Presentation** (delivered during Lectures 11 and 12, **Friday, November 21 & 28, 2025**): <span className="highlight-red-bold">10% of final grade</span>

   - A 4-minute in-class presentation showcasing your project’s features and technical implementation, graded 5% by peer review and 5% by instructor/TAs using the same [rubric](/project/presentation-rubric).

3. **Final Project Deliverable** (due **Monday, December 8, 2025, 11:59 PM**): <span className="highlight-red-bold">25% of final grade</span>

   - **Source Code**: Delivered as a public or private Git repository on GitHub. Ensure that your repository is well-organized, with clear structure and comments.
   - **Final Report**: A detailed report to ensure full reproducibility of your work, delivered as a `README.md` file in your Git repository.
   - **Video Demo**: A video demonstration of your project, lasting between 1 and 5 minutes. The demo should highlight the key features and functionality of your application. Include the video URL in the `## Video Demo` section of your final report (the `README.md` file).

## Project Idea

The course project represents a more innovative and time-consuming piece of work than the course assignments, requiring teamwork to build a **stateful cloud-native application** (e.g., a web app or service that maintains user data across sessions/restarts). It involves three key stages: **forming a team**, **writing a project proposal**, and **completing the final deliverable**. Your project <span className="highlight-red-bold">MUST</span> be deployed to a cloud or edge provider and <span className="highlight-red-bold">MUST</span> incorporate the following technologies and features:

### Core Technical Requirements

<Steps>

#### Containerization and Local Development (Required for ALL projects)

- Use **Docker** to containerize the application (e.g., Node.js backend, database).
- Use **Docker Compose** for multi-container setup (e.g., app + database).

#### State Management (Required for ALL projects)

- Use **PostgreSQL** for relational data persistence.
- Implement **persistent storage** (e.g., [DigitalOcean Volumes](https://docs.digitalocean.com/products/volumes/) or [Fly Volumes](https://fly.io/docs/volumes/)) to ensure state survives container restarts or redeployments.

#### Deployment Provider (Required for ALL projects)

- Deploy to either **DigitalOcean** (IaaS focus) or **Fly.io** (edge/PaaS focus).

#### Orchestration Approach (Choose ONE)

**Option A: Docker Swarm Mode**

- Use Docker Swarm mode for clustering and orchestration.
- Implement service replication and load balancing.

**Option B: Kubernetes**

- Use Kubernetes for orchestration (start with minikube locally, then deploy to a cloud-managed cluster, e.g., [DigitalOcean Kubernetes](https://www.digitalocean.com/products/kubernetes)).
- Include Deployments, Services, and PersistentVolume for stateful data.

<Callout type="info">

**Note on Orchestration on Fly.io**

Using Fly.io’s built-in scaling, replication, or global distribution features alone does **not** satisfy the orchestration requirement, because these are provider-level capabilities rather than an implementation of Docker Swarm or Kubernetes.

[Fly Kubernetes Service (FKS)](https://fly.io/docs/kubernetes/fks-quickstart/) is **not** required. It is a paid beta feature ($75/month per cluster) and may have limited documentation or bugs. You may use it if you wish, but it is not recommended.

For Kubernetes, please use minikube locally plus a managed Kubernetes service — DigitalOcean Kubernetes — or Docker Swarm on Fly.io/DigitalOcean. These options fully satisfy the course requirements and avoid unnecessary cost or complexity.

</Callout>

#### Monitoring and Observability (Required for ALL projects)

- Integrate monitoring using provider tools (e.g., DigitalOcean metrics/alerts for CPU, memory, disk; Fly.io logs/metrics).
- Set up basic alerts or dashboards for key metrics.
- _(Optional)_ You may also integrate metrics/logs/traces into your frontend if you have one to make the demo clearer.

</Steps>

<Callout type="info">

**Note on Frontend (UI)**

A frontend is **not required**, but you may include a simple web interface (e.g., built with [Next.js](https://nextjs.org) or another framework) to make your demo and presentation clearer. The grading focus is on your backend, architecture, and deployment, not UI complexity.

</Callout>

### Advanced Features (Must implement at least two)

- Serverless integration (e.g., DigitalOcean Functions or Fly.io for event-driven tasks like notifications).
- Real-time functionality (e.g., WebSockets for live updates).
- Auto-scaling and high availability (e.g., configure Swarm/K8s to scale based on load).
- Security enhancements (e.g., authentication/authorization, HTTPS, secrets management).
- CI/CD pipeline (e.g., GitHub Actions for automated builds/deployments).
- Backup and recovery (e.g., automated database backups to cloud storage).
- Integration with external services (e.g., email notifications via SendGrid).
- Edge-specific optimizations (e.g., global distribution on Fly.io with region-based routing).

### Note on Project Requirements and Scope

<Callout type="error" emoji="❗">
  **Meeting the [Core Technical Requirements](#core-technical-requirements) is
  mandatory — no exceptions.** Projects must use specified tools (e.g.,
  DigitalOcean/Fly.io, PostgreSQL) to align with course content, ensure fair
  grading and peer review, and keep costs/complexity manageable. Alternative
  platforms (e.g., AWS/GCP) are not permitted. However, students are encouraged
  to explore advanced features within the approved tools.
</Callout>

Your project <span className="highlight-red-bold">MUST</span> implement all core technologies and at least two advanced features. To ensure an achievable project within the ~2-month timeline, avoid these pitfalls:

- **Too simple**: A basic CRUD app without orchestration or monitoring shows insufficient mastery.
- **Too complex**: Distributed systems or ML integrations are hard to complete effectively.
- **Too broad**: A full-scale platform (e.g., a cloud-native social media app) risks shallow implementation.

The **goal** is to develop a **well-scoped, thoughtfully implemented application** that effectively showcases your understanding of cloud computing principles using the required technologies. A successful project should have a **clear purpose, achievable scope, and polished implementation of core features**.

Remember: A well-executed, focused project is far more valuable than an overly ambitious one that cannot be completed properly within the course timeline. While creativity and innovation are encouraged, please keep in mind that <span className="highlight-purple-bold">this is a course project with specific learning objectives to achieve.</span>

### Example Project Ideas

Below are some inspiring project ideas to guide your team. Smaller teams (2 members) may implement a subset of features, while larger teams (3-4 members) should aim for more features or added complexity. **All projects must fulfill the [Core Technical Requirements](#core-technical-requirements)**. The listed features illustrate potential scope rather than strict expectations. Teams are also encouraged to propose unique project ideas tailored to their interests and expertise, provided the scope is realistic and achievable within the project timeline.

1. **Collaborative Task Management Platform**

   A cloud-native web application for teams to manage tasks with real-time updates and persistent data storage.

   **Key Features**:

   - User authentication and team-based project management
   - Role-based access control (e.g., Admin, Member)
   - Task creation, assignment, and status tracking (e.g., To-Do, In Progress, Done)
   - Real-time task updates using WebSockets
   - Persistent storage for tasks and user data using PostgreSQL and DigitalOcean Volumes
   - Dockerized Node.js backend with Docker Compose for local development
   - Deployment on DigitalOcean with Docker Swarm for orchestration
   - Monitoring dashboard for CPU, memory, and task activity metrics
   - Automated database backups to cloud storage
   - CI/CD pipeline with GitHub Actions for automated deployments
   - Search functionality for tasks by keyword or assignee

---

2. **Event Logging and Analytics System**

   A platform to collect, store, and analyze event data (e.g., IoT sensor readings or user interactions) with real-time insights.

   **Key Features**:

   - User authentication and organization-based access
   - REST API for event ingestion and data retrieval
   - Real-time event visualization with dynamic charts
   - PostgreSQL for event storage with Fly.io persistent volumes
   - Dockerized Python backend with Docker Compose for local setup
   - Deployment on Fly.io with Kubernetes for orchestration
   - Monitoring alerts for high event volume or system health
   - Automated backups of event data to cloud storage
   - Auto-scaling based on event ingestion load
   - Search and filter events by timestamp, type, or source
   - Serverless notifications for critical events (e.g., via DigitalOcean Functions)

---

3. **Content Sharing and Collaboration Platform**

   A cloud-based system for users to upload, share, and collaborate on content (e.g., documents, images).

   **Key Features**:

   - User authentication with role-based permissions (e.g., Owner, Collaborator, Viewer)
   - File upload and management with version history
   - Collaborative commenting and tagging on content
   - PostgreSQL for metadata and user data with DigitalOcean Volumes
   - Dockerized Node.js backend with Docker Compose for local testing
   - Deployment on DigitalOcean with Docker Swarm for load balancing
   - Monitoring for storage usage and API performance metrics
   - CI/CD pipeline using GitHub Actions for automated builds
   - Search functionality for content by tags or metadata
   - HTTPS and authentication for secure access
   - Export content metadata in JSON or CSV formats

---

4. **Inventory Management System**

   A cloud-native application for tracking and managing inventory with real-time updates and edge optimizations.

   **Key Features**:

   - User authentication with role-based access (e.g., Manager, Staff)
   - Inventory CRUD operations (create, read, update, delete) for items
   - Real-time stock updates using WebSockets
   - PostgreSQL for inventory data with Fly.io persistent volumes
   - Dockerized Python backend with Docker Compose for local development
   - Deployment on Fly.io with Kubernetes for orchestration
   - Monitoring dashboard for inventory levels and system health
   - Automated backups of inventory data to cloud storage
   - Edge routing for low-latency access across regions
   - Search and filter inventory by category, quantity, or location
   - Serverless email notifications for low-stock alerts

---

5. **Scientific Data Repository**

   A platform for researchers to store, share, and analyze scientific datasets with access control and visualization.

   **Key Features**:

   - User authentication and role-based permissions (e.g., Researcher, Admin)
   - Dataset upload and metadata management (e.g., tags, descriptions)
   - Access control for public/private datasets
   - PostgreSQL for dataset metadata with DigitalOcean Volumes
   - Dockerized Python backend with Docker Compose for local setup
   - Deployment on DigitalOcean with Docker Swarm for orchestration
   - Monitoring for storage usage and dataset access metrics
   - Visualization dashboard for dataset trends
   - Serverless notifications for dataset updates
   - Search functionality for datasets by metadata or tags
   - Backup and recovery system for dataset integrity

<Callout type="info">

**Clarification on Team Size and Grading**

Grading is consistent for all teams (2-4 students), with expectations scaled by team size. All teams must implement core technical requirements (Docker, PostgreSQL, storage, orchestration, monitoring) and at least two advanced features. Smaller teams (2 members) may use simpler implementations, while larger teams (3-4 members) should add complexity, as shown in [Example Project Ideas](#example-project-ideas).

Rubrics for the Project Proposal, Presentation, and Final Deliverable focus on quality and requirements, not team size. The [Project Completion rubric](#project-completion-30-out-of-20-points) adjusts code expectations: 1000+ lines per member (2-member teams), 850+ (3-member teams), 700+ (4-member teams). [Individual contributions](#individual-contributions-20-out-of-20-points) are verified via GitHub commits to ensure fairness. More members mean more coordination, which balances workload across team sizes.

</Callout>

## Project Proposal

The project proposal should be submitted as a single file in the form of a [Markdown document](https://daringfireball.net/projects/markdown/) (with the `.md` suffix in the filename), with a maximum length of 2000 words. Other formats (such as Microsoft Word or Adobe PDF) will not be accepted, as Markdown is the industry standard for technical documentation in software development. The project proposal should include the following three sections of the project, described clearly and concisely:

### Required Sections

#### 1. Motivation

- Identify the problem or need your project addresses
- Explain why the project is worth pursuing
- Describe target users
- Optional: Discuss existing solutions and their limitations

#### 2. Objective and Key Features

- Clear statement of project objectives
- Detailed description of core features, including:
  - Chosen orchestration approach (Swarm or Kubernetes)
  - Database schema and persistent storage
  - Deployment provider (DigitalOcean or Fly.io)
  - Monitoring setup
  - Planned advanced features (at least two)
- Explanation of how these features fulfill the course project requirements
- Discussion of project scope and feasibility within the timeframe

#### 3. Tentative Plan

- Describe how your team plans to achieve the project objective in a matter of weeks, with clear descriptions of responsibilities for each team member
- No need to include milestones and tentative dates, as the duration of the project is short

### Marking Rubrics

#### Motivation: 30% (out of 10 Points)

- **10 Points**: The motivation is sufficiently convincing, with a clear problem statement and well-defined target users. The proposal demonstrates thoughtful consideration of why this project is worth pursuing and how it benefits its intended users.
- **6 Points**: The motivation is present but lacks conviction or clarity. The problem statement or target users are vaguely defined, making it difficult to understand the project's value.
- **0 Point**: The motivation section is missing or completely irrelevant to the project scope.

#### Objective and Key Features: 50% (out of 10 Points)

- **10 Points**: The objectives are clearly defined with specific technical features that properly utilize course technologies. The scope is realistic for the team size and project timeline, demonstrating a good balance between innovation and feasibility.
- **6 Points**: The objectives and features are present but lack clarity or completeness. Some required technologies may be underutilized, or the scope may need adjustment to be more realistic for the timeline.
- **0 Point**: The objectives and features section is missing or fails to address the basic course project requirements.

#### Tentative Plan: 20% (out of 10 Points)

- **10 Points**: The proposed plan is concise and clear, includes responsibilities for each team member, and a casual reader can be convinced that the project can be reasonably completed by the project due data.
- **6 Points**: The proposed plan has been included, but not clear to a casual reader.
- **0 Point**: The proposed plan is missing or incomprehensible.

### Submission

Submit a single Markdown document to the assignment labeled **Project Proposal** in the [Quercus course website](https://q.utoronto.ca/courses/396624/assignments/1584475) by **Monday, October 20, 2025, 11:59 PM**. Each member of the team should make their own submission, but obviously all members in the same team should submit the same document.

<Callout type="info">

**Note on Project Changes Post-Proposal**

You are allowed to modify your project idea, features, or scope after submitting the proposal (e.g., based on challenges, or new insights). We will not enforce consistency between the proposal and your final deliverables — each will be graded independently using the provided marking rubrics.

</Callout>

## Presentation

Each team will deliver a **4-minute presentation** during Lecture 11 (November 21, 2025) or Lecture 12 (November 28, 2025) to showcase the project’s features and technical implementation.

Presentation slots have been randomly assigned and can be viewed here:

- [November 21 Slots](/lectures/lecture-11)
- [November 28 Slots](/lectures/lecture-12)

Teams may designate 1–2 members to present, but all members must attend both sessions to provide peer feedback. Exceptions are granted only to part-time MEng students with unavoidable work conflicts.

### Submission

- Submit presentation slides (or outline) individually via [Quercus](https://q.utoronto.ca/courses/396624/assignments/1584477) by **Wednesday, November 19, 2025, 11:59 PM**.
- All team members must upload the same file to ensure fairness.
- No major changes are allowed after the deadline.

### Content

- **Core Requirements (Mandatory)**: Demonstrate all core technical requirements in a local environment (e.g., Docker Compose or minikube), including:
  - **Docker** and **Docker Compose** for containerized app setup.
  - **PostgreSQL** with **persistent storage**.
  - Orchestration with **Docker Swarm** or **Kubernetes** (e.g., replication, load balancing).
  - **Monitoring** with provider tools (e.g., DigitalOcean/Fly.io metrics, alerts).
  - Show a live or recorded demo of these components.
- **Advanced Features Plan**: Present a feasible plan for at least two advanced features, including a simplified demo or mockup if partially implemented, with a completion timeline by December 8, 2025.
- Highlight the app’s stateful design, key features, and user flow.

### Expectations

- **Core Requirements**: By November 19, 2025, all core requirements must be functional and demo-ready in a local environment (e.g., Docker Compose or minikube), including Docker, PostgreSQL with persistent storage, orchestration (Swarm or Kubernetes), and monitoring. Teams may refine or enhance these features before the final deliverable deadline (December 8, 2025).
- **Advanced Features**: May be in progress, but a clear, realistic completion plan is required.
- **Demo**: Use a live or recorded demo to showcase all core features. Optionally include configuration snippets (e.g., Dockerfiles, Kubernetes YAML) for clarity.

### Grading

- Worth 10% of final grade (5% peer, 5% instructor/TAs), evaluated using the [Presentation Rubric](/project/presentation-rubric).
- Peer scores are normalized across days for fairness.

## Final Project Deliverable

The final project deliverable should be submitted as a URL to a public or private GitHub repository. If your repository is private, add the instructor and TAs (GitHub usernames: `cying17`, `yuel5304`, and `lastcysa`) as collaborators so that it can be read. Your repository must contain:

1. A final report (`README.md`)
2. Complete source code
3. A video demo
4. Deployment URL (if deployed)

### Final Report

A `README.md` file that contains the final report, in the form of a [Markdown document](https://daringfireball.net/projects/markdown/) of no more than 5000 words in total length [^1] [^2]. If you wish to include images (such as screenshots) in the final report, make sure that they are visible when the instructor and TAs visit your GitHub repository with a web browser. The final report should include the following logistical and technical aspects of the project, described clearly and concisely:

- **Team Information**: The names, student numbers, and preferred email addresses of all team members. Ensure these email addresses are active as they may be used for clarification requests.
- **Motivation**: What motivated your team to spend time on this project? Describe the problem you're solving and its significance.
- **Objectives**: What are the objectives of this project? Explain what you aimed to achieve through this implementation.
- **Technical Stack**: What technologies were used in the project? Include the chosen approach (Swarm or K8s) and other key technologies.
- **Features**: What are the main features offered by your application? Describe how they fulfill the course project requirements and achieve your project objectives.
- **User Guide**: How does a user interact with your application? Provide clear instructions for using each main feature, supported with screenshots where appropriate.
- **Development Guide**: What are the steps to set up the development environment? Include detailed instructions for environment, database, storage, and local testing.
- **Deployment Information** (if applicable): Include the live URL of your application.
- **Individual Contributions**: What were the specific contributions made by each team member? This should align with the Git commit history.
- **Lessons Learned and Concluding Remarks**: Share insights gained during the development process and any final thoughts about the project experience, if any.

### Source Code

Your GitHub repository must contain all code required to build and run the project, organized in a clear, logical directory structure. Required components include:

- Application code (e.g., Node.js, Python)
- Dockerfiles and Docker Compose/Kubernetes configs
- Database schemas and migrations
- Monitoring setup scripts
- Environment configuration templates

Include detailed setup and runtime instructions in the `README.md`’s Development Guide for local execution.

Your code should follow consistent formatting and include appropriate comments for complex logic. Consider including a `.gitignore` file to exclude unnecessary files and dependencies from version control.

<Callout type="info">

If your project requires sensitive credentials (e.g., API keys, database credentials) for execution, submit them in a password-protected `.zip` or `.tar.gz` file via email to TA Yuqiu Zhang: [quincy.zhang@mail.utoronto.ca](mailto:quincy.zhang@mail.utoronto.ca)

Send the password in a separate email to the TA. Both emails must be sent **by the final deliverable deadline**. Each team only needs to complete this step once.

In your Development Guide, clearly state "Credentials sent to TA".

</Callout>

### Video Demo

Include a 1–5 minute video demo, showcasing:

- Key features in action
- User flow through the app
- Technical highlights (e.g., Docker containers, PostgreSQL queries, orchestration, monitoring)
- The app running in the deployed cloud/edge environment (e.g., via a live URL on DigitalOcean or Fly.io)

The video's URL must be included in the `## Video Demo` section of the `README.md`. Host the video on a platform like YouTube, Dropbox, or Google Drive, ensuring access for the instructor and TAs. If under 100 MB, the video may be included directly in the GitHub repository.

### Marking Rubrics

#### Technical Implementation: 30% (out of 20 Points)

To be marked by reading the final report `README.md`, reviewing source code and testing the application functionality.

- **20 Points**: Complete and correct implementation of all required technologies (Docker, PostgreSQL, storage, Swarm/K8s, monitoring)
- **15 Points**: Implementation has minor issues in one or two areas
- **10 Points**: Basic implementation with several issues
- **5 Points**: Major issues in implementation
- **0 Points**: Missing critical technical components

#### Project Completion: 30% (out of 20 Points)

To be marked by reading the final report `README.md`, reviewing source code, and watching the video demo.

- **20 Points**: All proposed features working correctly with clear user flow. Meets minimum lines of meaningful code (excluding comments, `node_modules`, generated files, etc.) per member: 1000+ (2 members), 850+ (3 members), or 700+ (4 members).
- **15 Points**: Most features working as intended. Lines of meaningful code per member: 700–1000 (2 members), 600–850 (3 members), or 500–700 (4 members).
- **10 Points**: Basic features implemented. Lines of meaningful code per member: 400–700 (2 members), 300–600 (3 members), or 250–500 (4 members).
- **5 Points**: Features are significantly unfinished, or lines of meaningful code fall below the minimum threshold for the team size.
- **0 Points**: Minimal working functionality or insufficient code contribution.

<Callout type="info">
  Lines of code (LOC) are counted using
  [cloc](https://github.com/AlDanial/cloc), including application code (e.g.,
  JavaScript, Python, PHP), SQL, Dockerfiles, YAML, and JSON. Specify your
  programming language in the final report’s Features section. Comments,
  generated files (e.g., `node_modules`), and non-source files (e.g.,
  `.gitignore`, Markdown) are excluded. Functionality is prioritized over raw
  LOC.
</Callout>

#### Documentation and Code Quality: 20% (out of 20 Points)

To be marked by reading the final report `README.md` and reviewing code organization.

- **20 Points**: Comprehensive and well-structured `README.md` with clear setup instructions, a well-organized codebase, consistent coding style, and regular, meaningful Git commits
- **15 Points**: Good documentation with minor gaps in clarity, structure, or consistency
- **10 Points**: Basic documentation is present but lacks essential details, inconsistent code organization
- **5 Points**: Incomplete or unclear documentation or messy code
- **0 Points**: Missing documentation or chaotic code

#### Individual Contributions: 20% (out of 20 Points)

Individual marks will be assigned to each team member based on reading the final report `README.md` and reading the commit messages in the commit history in the GitHub repository.

- **20 Points**: The team member has made a fair amount of contributions to the project, without these contributions the project cannot be successfully completed on time.
- **15 Points**: The team member has made less than a fair amount of contributions to the project, _or_ without these contributions the project can still be successfully completed on time.
- **5 Points**: The team member has made less than a fair amount of contributions to the project, _and_ without these contributions the project can still be successfully completed on time.
- **0 Point**: The team member has not made any contributions to the project.

#### Bonus Points

Each of the following achievements grants 3% bonus points to the final project deliverable grade:

- **Notable Innovation in Implementation**: Implement a highly creative feature that exceeds course project requirements by using course technologies in a novel way (e.g., predictive alerts using monitoring tools or innovative edge routing on Fly.io for low-latency data delivery).
- **Exceptional User Experience**: Deliver a polished application interface or user flow beyond basic requirements, such as advanced visualizations (e.g., real-time dashboards), optimized performance (e.g., low-latency edge delivery), or comprehensive error handling and user feedback.
- **High-Quality Open Source Project**: Create a project usable by external developers, including:
  - Clear contribution guidelines (e.g., how to submit issues or pull requests)
  - Well-documented APIs or components (e.g., REST endpoints, Docker/Kubernetes configs)
  - Detailed installation and setup instructions for local and cloud deployment
  - An MIT or similar open-source license
  - A professional README with sections for installation, usage, and contribution guidelines

**Note**: Bonus points are awarded for exceeding course expectations, with a maximum of 9% extra credit added to the final project deliverable grade (25% of final grade). Innovative use of cloud/edge technologies or robust monitoring is highly valued.

### Submission

Submit a single URL — the URL to your team's GitHub repository — to the assignment labeled **Final Project Deliverable** in the [Quercus course website](https://q.utoronto.ca/courses/396624/assignments/1584480). Each member of the team should make their own submission, but obviously all members in the same team should submit the same URL.

<Callout type="warning">
  The deadline for the course project is **Monday, December 8, 2025**, at
  **11:59 PM** Eastern time, and late submissions will **NOT** be accepted. Do
  remember to add the instructor and TAs (GitHub usernames: `cying17`,
  `yuel5304`, and `lastcysa`) as collaborators to the GitHub repository, if it
  is private, **before** the deadline.
</Callout>

[^1]: There is no minimum length requirement for the final report in `README.md`. Other formats (such as Microsoft Word or Adobe PDF) will not be accepted, as Markdown is the standard documentation format in software development.
[^2]: You may reuse relevant content from your project proposal where appropriate.

## Tips and Suggestions

### Using GitHub for Project Management and Effective Collaboration

Effective teamwork depends on efficient communication and collaboration, often more so than completing individual tasks. To streamline your team’s workflow, I highly recommend using **GitHub** as your central collaboration hub. Treat your GitHub repository as your team’s central workspace — it’s not just for code storage but also a powerful tool for organizing and managing your entire project. Here’s how to leverage its full functionality:

- **Commit Frequently and Meaningfully**: Every change to the code should be committed to the repository immediately, accompanied by a **complete, concise, and meaningful commit message**. This helps everyone stay on the same page and track progress over time.
- **Use Branches and Pull Requests**: Create a new branch for each feature or task. Once the feature is complete, submit a pull request for review. This ensures code quality, facilitates collaboration, and makes it easier to integrate changes.
- **Use GitHub Issues for Task Management**: Create GitHub Issues to maintain a “to-do” list of outstanding tasks. Assign issues to team members, add labels for priority or category, and close them once completed. This keeps your workflow organized and transparent.
- **Leverage GitHub Discussions for Communication**: Use GitHub Discussions to document all team conversations, decisions, and brainstorming sessions. This ensures that nothing gets lost, and you can always refer back to previous discussions if needed.
- **Document Everything in the GitHub Wiki**: Use the GitHub Wiki as your project journal to record major decisions, challenges, and solutions. This creates a valuable reference for your team and anyone who might review your project in the future.

Check [this page](/resources/github-usage) for a step-by-step guide on using GitHub to manage tasks and collaborate effectively.