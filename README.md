# Your Vote, Your Voice 🗳️
### A Non-Partisan Guide to Indian Democracy

**🚀 Live Demo: [https://elect-prompt-wars-377948726237.us-central1.run.app/](https://elect-prompt-wars-377948726237.us-central1.run.app/)**

**Your Vote, Your Voice** is a modern, responsive, and neutral web application designed to empower Indian citizens with accurate information about the electoral process. It simplifies the journey to the polls by providing localized data, registration guidance, and essential voter resources in a clean, user-friendly interface.

---

## 🌟 Key Features

- **🔍 Smart PIN Code Search**: Enter your 6-digit Indian PIN code to instantly fetch your region's details and the next known legislative election date via live Wikipedia and India Post APIs.
- **🗺️ India Election Navigator**: A comprehensive state and city selector that provides tailored election administrative office details, statutory timelines, and official resource links.
- **✅ Voter Readiness Checklist**: An interactive progress-tracked checklist to ensure you have verified your registration, located your polling booth, and prepared your photo ID.
- **📅 Add to Calendar**: Download a `.ics` reminder for Election Day to ensure you never miss your chance to vote.
- **🛣️ AI Voter Roadmap**: Generate a personalized 3-step action plan for the 2026–2027 election cycle based on your age, state, and policy interests. Powered by Google Gemini, it provides state-specific logistics, official resources, and PDF export capabilities.
- **📱 Responsive Design**: Fully optimized for mobile, tablet, and desktop viewing with smooth animations and modern aesthetics.
- **🤖 AI-Powered Assistant**: Integrated with Google Gemini API for real-time voter assistance and guidance.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, TailwindCSS, HTML5, JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **APIs Integrated**:
  - [India Post PIN Code API](https://www.postalpincode.in/Api-Details)
  - [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page)
  - [CountriesNow API](https://countriesnow.space/)
  - Google Gemini API
- **Deployment**: Dockerized for Google Cloud Run.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/rushii23-dev/elect-prompt-war.git
   cd elect-prompt-war
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the local development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

---

## ☁️ Deployment

This project is configured for easy deployment to **Google Cloud Run**.

### Build and Deploy
1. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   gcloud config set project promptwar2-494717
   ```

2. **Deploy**:
   ```bash
   gcloud run deploy elect-prompt-wars --source . --region us-central1 --allow-unauthenticated
   ```

---

## 📄 License

This project is dedicated to the public domain as a non-partisan tool for civic engagement. Feel free to use and adapt it for any non-political, educational purpose.

---

## 🤝 Contribution

Contributions are welcome! If you have suggestions for new features or data sources, feel free to open an issue or submit a pull request.

**Developed with ❤️ for the Indian Voter.**