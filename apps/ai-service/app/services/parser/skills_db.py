"""
Comprehensive skills database — 600+ terms normalized for matching.
key = lowercase for matching, value = canonical display name.
"""

SKILLS_DB: dict[str, str] = {
    # ── Programming Languages ──────────────────────────────────────────────
    "python": "Python", "javascript": "JavaScript", "typescript": "TypeScript",
    "java": "Java", "c++": "C++", "c#": "C#", "c": "C", "go": "Go",
    "golang": "Go", "rust": "Rust", "ruby": "Ruby", "php": "PHP",
    "swift": "Swift", "kotlin": "Kotlin", "scala": "Scala", "r": "R",
    "matlab": "MATLAB", "perl": "Perl", "shell": "Shell", "bash": "Bash",
    "powershell": "PowerShell", "lua": "Lua", "haskell": "Haskell",
    "elixir": "Elixir", "clojure": "Clojure", "erlang": "Erlang",
    "f#": "F#", "dart": "Dart", "groovy": "Groovy", "vba": "VBA",
    "sql": "SQL", "pl/sql": "PL/SQL", "t-sql": "T-SQL", "cobol": "COBOL",
    "assembly": "Assembly", "solidity": "Solidity", "julia": "Julia",
    "objective-c": "Objective-C", "coffeescript": "CoffeeScript",

    # ── Frontend ───────────────────────────────────────────────────────────
    "react": "React", "react.js": "React.js", "reactjs": "React.js",
    "vue": "Vue", "vue.js": "Vue.js", "vuejs": "Vue.js",
    "angular": "Angular", "angularjs": "AngularJS",
    "svelte": "Svelte", "sveltekit": "SvelteKit",
    "next.js": "Next.js", "nextjs": "Next.js",
    "nuxt.js": "Nuxt.js", "nuxtjs": "Nuxt.js",
    "gatsby": "Gatsby", "remix": "Remix",
    "html": "HTML", "html5": "HTML5", "css": "CSS", "css3": "CSS3",
    "tailwind": "Tailwind CSS", "tailwind css": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "bootstrap": "Bootstrap", "material-ui": "Material-UI", "mui": "MUI",
    "ant design": "Ant Design", "antd": "Ant Design",
    "chakra ui": "Chakra UI", "shadcn": "shadcn/ui",
    "sass": "SASS", "scss": "SCSS", "less": "LESS",
    "styled-components": "Styled Components",
    "jquery": "jQuery", "redux": "Redux", "zustand": "Zustand",
    "mobx": "MobX", "recoil": "Recoil", "jotai": "Jotai",
    "react query": "React Query", "tanstack query": "TanStack Query",
    "swr": "SWR", "rxjs": "RxJS",
    "webpack": "Webpack", "vite": "Vite", "parcel": "Parcel",
    "rollup": "Rollup", "babel": "Babel", "eslint": "ESLint",
    "prettier": "Prettier", "storybook": "Storybook",
    "framer motion": "Framer Motion", "three.js": "Three.js",
    "d3": "D3.js", "d3.js": "D3.js", "chart.js": "Chart.js",

    # ── Backend ────────────────────────────────────────────────────────────
    "node.js": "Node.js", "nodejs": "Node.js",
    "express": "Express", "express.js": "Express.js",
    "nestjs": "NestJS", "fastify": "Fastify", "hapi": "Hapi",
    "koa": "Koa", "fastapi": "FastAPI", "django": "Django",
    "flask": "Flask", "spring boot": "Spring Boot", "spring": "Spring",
    "rails": "Rails", "ruby on rails": "Ruby on Rails",
    "laravel": "Laravel", "symfony": "Symfony",
    "asp.net": "ASP.NET", ".net": ".NET", ".net core": ".NET Core",
    "gin": "Gin", "echo": "Echo", "fiber": "Fiber",
    "actix": "Actix", "rocket": "Rocket", "axum": "Axum",
    "grpc": "gRPC", "graphql": "GraphQL", "rest api": "REST API",
    "restful": "RESTful APIs", "restful api": "RESTful APIs",
    "rest apis": "REST APIs", "trpc": "tRPC",
    "websockets": "WebSockets", "socket.io": "Socket.io",
    "celery": "Celery", "dramatiq": "Dramatiq",

    # ── Databases ──────────────────────────────────────────────────────────
    "postgresql": "PostgreSQL", "postgres": "PostgreSQL",
    "mysql": "MySQL", "sqlite": "SQLite", "mariadb": "MariaDB",
    "mongodb": "MongoDB", "mongo": "MongoDB",
    "redis": "Redis", "elasticsearch": "Elasticsearch",
    "dynamodb": "DynamoDB", "cassandra": "Cassandra",
    "neo4j": "Neo4j", "couchdb": "CouchDB", "influxdb": "InfluxDB",
    "firebase": "Firebase", "firestore": "Firestore",
    "supabase": "Supabase", "planetscale": "PlanetScale",
    "cockroachdb": "CockroachDB", "clickhouse": "ClickHouse",
    "snowflake": "Snowflake", "bigquery": "BigQuery",
    "prisma": "Prisma", "typeorm": "TypeORM", "sqlalchemy": "SQLAlchemy",
    "sequelize": "Sequelize", "mongoose": "Mongoose",
    "drizzle": "Drizzle ORM", "hibernate": "Hibernate",

    # ── Cloud & Infrastructure ─────────────────────────────────────────────
    "aws": "AWS", "amazon web services": "AWS",
    "gcp": "GCP", "google cloud": "Google Cloud",
    "azure": "Azure", "microsoft azure": "Azure",
    "heroku": "Heroku", "render": "Render", "netlify": "Netlify",
    "vercel": "Vercel", "railway": "Railway",
    "digitalocean": "DigitalOcean", "fly.io": "Fly.io",
    "cloudflare": "Cloudflare", "aws lambda": "AWS Lambda",
    "aws ec2": "AWS EC2", "aws s3": "AWS S3", "aws rds": "AWS RDS",
    "aws ecs": "AWS ECS", "aws eks": "AWS EKS",
    "cloud functions": "Cloud Functions", "cloud run": "Cloud Run",
    "app engine": "App Engine", "gke": "GKE", "aks": "AKS",
    "serverless": "Serverless",

    # ── DevOps & CI/CD ─────────────────────────────────────────────────────
    "docker": "Docker", "kubernetes": "Kubernetes", "k8s": "Kubernetes",
    "terraform": "Terraform", "ansible": "Ansible",
    "puppet": "Puppet", "chef": "Chef",
    "jenkins": "Jenkins", "github actions": "GitHub Actions",
    "gitlab ci": "GitLab CI", "circleci": "CircleCI",
    "travis ci": "Travis CI", "argocd": "ArgoCD",
    "flux": "Flux", "helm": "Helm",
    "prometheus": "Prometheus", "grafana": "Grafana",
    "elk stack": "ELK Stack", "datadog": "Datadog",
    "new relic": "New Relic", "sentry": "Sentry",
    "nginx": "Nginx", "apache": "Apache", "haproxy": "HAProxy",
    "istio": "Istio", "consul": "Consul", "vault": "Vault",
    "ci/cd": "CI/CD", "devops": "DevOps",
    "git": "Git", "github": "GitHub", "gitlab": "GitLab",
    "bitbucket": "Bitbucket",
    "linux": "Linux", "ubuntu": "Ubuntu", "centos": "CentOS",
    "macos": "macOS", "windows server": "Windows Server",
    "bash scripting": "Bash Scripting",

    # ── AI / ML / Data Science ─────────────────────────────────────────────
    "tensorflow": "TensorFlow", "pytorch": "PyTorch",
    "keras": "Keras", "scikit-learn": "scikit-learn",
    "sklearn": "scikit-learn", "pandas": "Pandas",
    "numpy": "NumPy", "matplotlib": "Matplotlib",
    "seaborn": "Seaborn", "plotly": "Plotly",
    "opencv": "OpenCV", "hugging face": "Hugging Face",
    "transformers": "Transformers", "langchain": "LangChain",
    "llamaindex": "LlamaIndex", "openai": "OpenAI",
    "anthropic": "Anthropic", "claude": "Claude", "chatgpt": "ChatGPT",
    "gpt-4": "GPT-4", "bert": "BERT", "yolo": "YOLO",
    "xgboost": "XGBoost", "lightgbm": "LightGBM", "catboost": "CatBoost",
    "spark": "Apache Spark", "apache spark": "Apache Spark",
    "pyspark": "PySpark", "hadoop": "Hadoop",
    "airflow": "Apache Airflow", "mlflow": "MLflow",
    "weights & biases": "W&B", "dvc": "DVC",
    "onnx": "ONNX", "tensorrt": "TensorRT", "cuda": "CUDA",
    "prompt engineering": "Prompt Engineering",
    "rag": "RAG", "retrieval augmented generation": "RAG",
    "vector database": "Vector Database", "pinecone": "Pinecone",
    "weaviate": "Weaviate", "chroma": "Chroma", "qdrant": "Qdrant",
    "llm": "LLM", "fine-tuning": "Fine-tuning",
    "computer vision": "Computer Vision",
    "natural language processing": "NLP", "nlp": "NLP",
    "machine learning": "Machine Learning",
    "deep learning": "Deep Learning",
    "time series": "Time Series", "ai": "AI",
    "artificial intelligence": "Artificial Intelligence",
    "generative ai": "Generative AI", "gen ai": "Generative AI",
    "ai workflow integration": "AI Workflow Integration",
    "ai-assisted development": "AI-assisted Development",
    "ai prototyping": "AI Prototyping",

    # ── Mobile ─────────────────────────────────────────────────────────────
    "react native": "React Native", "flutter": "Flutter",
    "swiftui": "SwiftUI", "jetpack compose": "Jetpack Compose",
    "xamarin": "Xamarin", "ionic": "Ionic",
    "capacitor": "Capacitor", "expo": "Expo",
    "android": "Android", "ios": "iOS",

    # ── Testing ────────────────────────────────────────────────────────────
    "jest": "Jest", "mocha": "Mocha", "chai": "Chai",
    "jasmine": "Jasmine", "cypress": "Cypress",
    "playwright": "Playwright", "selenium": "Selenium",
    "puppeteer": "Puppeteer", "pytest": "Pytest",
    "unittest": "unittest", "junit": "JUnit", "testng": "TestNG",
    "vitest": "Vitest", "testing library": "Testing Library",
    "supertest": "Supertest", "k6": "k6",
    "locust": "Locust", "jmeter": "JMeter",
    "sonarqube": "SonarQube", "tdd": "TDD", "bdd": "BDD",

    # ── Security ───────────────────────────────────────────────────────────
    "oauth": "OAuth", "jwt": "JWT", "https": "HTTPS",
    "ssl/tls": "SSL/TLS", "cors": "CORS", "csrf": "CSRF",
    "xss": "XSS", "sql injection": "SQL Injection",
    "owasp": "OWASP", "penetration testing": "Penetration Testing",
    "sast": "SAST", "dast": "DAST", "snyk": "Snyk",
    "auth0": "Auth0", "keycloak": "Keycloak",
    "ldap": "LDAP", "sso": "SSO", "mfa": "MFA",
    "zero trust": "Zero Trust", "iam": "IAM",

    # ── Design & UX ────────────────────────────────────────────────────────
    "figma": "Figma", "adobe xd": "Adobe XD",
    "sketch": "Sketch", "zeplin": "Zeplin",
    "invision": "InVision", "storybook": "Storybook",
    "design systems": "Design Systems",
    "responsive design": "Responsive Design",
    "accessibility": "Accessibility", "wcag": "WCAG",
    "ux research": "UX Research", "prototyping": "Prototyping",
    "wireframing": "Wireframing", "ui/ux": "UI/UX",

    # ── Business & Analytics Tools ─────────────────────────────────────────
    "power bi": "Power BI", "tableau": "Tableau",
    "excel": "Excel", "advanced excel": "Advanced Excel",
    "google analytics": "Google Analytics",
    "looker": "Looker", "metabase": "Metabase",
    "salesforce": "Salesforce", "hubspot": "HubSpot",
    "jira": "Jira", "confluence": "Confluence",
    "notion": "Notion", "asana": "Asana",
    "slack": "Slack", "vs code": "VS Code", "vscode": "VS Code",
    "intellij": "IntelliJ", "pycharm": "PyCharm",
    "postman": "Postman", "insomnia": "Insomnia",
    "swagger": "Swagger", "openapi": "OpenAPI",

    # ── Methodologies ──────────────────────────────────────────────────────
    "agile": "Agile", "scrum": "Scrum", "kanban": "Kanban",
    "safe": "SAFe", "waterfall": "Waterfall",
    "sdlc": "SDLC", "oop": "OOP",
    "functional programming": "Functional Programming",
    "microservices": "Microservices", "monolith": "Monolith",
    "event-driven": "Event-Driven Architecture",
    "domain-driven design": "Domain-Driven Design", "ddd": "DDD",
    "clean architecture": "Clean Architecture",
    "solid principles": "SOLID Principles",
    "design patterns": "Design Patterns",
    "api design": "API Design", "system design": "System Design",

    # ── Soft Skills ────────────────────────────────────────────────────────
    "leadership": "Leadership", "communication": "Communication",
    "problem solving": "Problem Solving",
    "critical thinking": "Critical Thinking",
    "teamwork": "Teamwork", "collaboration": "Collaboration",
    "adaptability": "Adaptability", "time management": "Time Management",
    "mentoring": "Mentoring", "coaching": "Coaching",
    "presentation": "Presentation", "public speaking": "Public Speaking",
    "negotiation": "Negotiation",
    "decision making": "Decision Making",
    "strategic planning": "Strategic Planning",
    "innovation": "Innovation", "creativity": "Creativity",
    "project management": "Project Management",
    "product management": "Product Management",
    "business analysis": "Business Analysis",
    "data analysis": "Data Analysis",
    "technical writing": "Technical Writing",
    "documentation": "Documentation",
}

# Flat set of canonical names for fast lookup
ALL_SKILLS: set[str] = set(SKILLS_DB.values())

# Category groupings for technology vs soft skill distinction
TECHNOLOGY_SKILLS: set[str] = {
    v for k, v in SKILLS_DB.items()
    if k not in {
        "leadership", "communication", "problem solving", "critical thinking",
        "teamwork", "collaboration", "adaptability", "time management",
        "mentoring", "coaching", "presentation", "public speaking",
        "negotiation", "decision making", "strategic planning",
        "innovation", "creativity",
    }
}

SOFT_SKILLS: set[str] = {
    "Leadership", "Communication", "Problem Solving", "Critical Thinking",
    "Teamwork", "Collaboration", "Adaptability", "Time Management",
    "Mentoring", "Coaching", "Presentation", "Public Speaking",
    "Negotiation", "Decision Making", "Strategic Planning",
    "Innovation", "Creativity", "Project Management",
}

# Human (spoken) languages — separate from programming languages
HUMAN_LANGUAGES: set[str] = {
    "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
    "Bengali", "Marathi", "Gujarati", "Punjabi", "Urdu",
    "Spanish", "French", "German", "Italian", "Portuguese",
    "Chinese", "Mandarin", "Japanese", "Korean", "Arabic",
    "Russian", "Dutch", "Swedish", "Norwegian", "Danish",
}

HUMAN_LANGUAGE_PATTERNS = {lang.lower() for lang in HUMAN_LANGUAGES}
