# StudyTracker Pro 📚

A modern, high-performance study tracking web application built with **Vite**, **Firebase**, and **Tailwind CSS**.

## ✨ Features

- **Personal Dashboard**: Visualize your study progress with interactive charts (Chart.js).
- **Smart Timetable**: User-specific schedule with AM/PM support and PDF export.
- **Lecture Repository**: Organized access to course materials and recordings.
- **Real-time Analytics**: Admin panel to monitor active users and daily logins.
- **Profile Customization**: Client-side image resizing and Base64 storage in Firestore.
- **Aesthetic UI**: Smooth transitions, glassmorphism, and responsive mobile navigation.

## 🚀 Tech Stack

- **Frontend**: JavaScript, HTML5, CSS3 (Vanilla + Tailwind)
- **Backend/Database**: Firebase (Auth, Firestore)
- **Visualization**: Chart.js
- **PDF Generation**: jsPDF + AutoTable
- **Build Tool**: Vite

## 🛠️ Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/StudyTracker_Pro.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
   - Add your Firebase config to `src/firebase.js`.
   - Update Firestore rules as documented in `FEATURE_UPDATES.md`.

4. **Run locally**
   ```bash
   npm run dev
   ```

## 📝 License

This project is for educational purposes.
