Face Shape-Based Smart Eyeglass Recommendation System

Project Overview

Live Demo

Open the Live Application →

Live URL: https://face-shape-eyeglass.vercel.app/

Face Shape-Based Smart Eyeglass Recommendation System is an
AI-powered web application that helps users select suitable eyeglass
frames based on their facial shape.

The system allows a user to upload a front-facing face image or use a
live camera, analyzes the facial characteristics, identifies the most
likely face shape, and recommends eyeglass frame styles that complement
the detected shape.

The project also includes an Admin Dashboard for monitoring users,
image uploads, predictions, logins, and system activity.

Key Features

User Module

Upload a face image in JPG or PNG format.

Analyze a front-facing facial image.

Detect the user's likely face shape.

Display face-shape confidence scores.

Recommend suitable eyeglass frame styles.

Display frame styles such as:

Aviator

Wide

Square

Rectangle

Round

Show recommended and less-suitable frame styles.

Display facial measurement information used by the recommendation
process.

Browse the available frame library.

Save or reset analysis results.

Live-camera option for real-time image capture.

Admin Module

Secure admin login.

Dashboard with system statistics.

View total users.

View active users.

Track uploaded images.

Track generated predictions.

Track user logins.

View user activity trends.

Manage registered users.

View image gallery.

View live activity logs.

Change admin display name.

Change admin password.

Clear user activity/history when required.

How the System Works

The application follows this general workflow:

User
  |
  v
Upload Photo / Live Camera
  |
  v
Face Detection & Facial Analysis
  |
  v
Face Shape Classification
  |
  v
Confidence Score
  |
  v
Frame Recommendation Engine
  |
  v
Recommended Eyeglass Frames

Step 1: Image Input

The user uploads a front-facing photograph or uses the live-camera
option.

Step 2: Face Detection

The application identifies the face and extracts relevant facial
characteristics.

Step 3: Face Shape Analysis

Facial proportions such as face length, jaw width, forehead width, and
chin characteristics are analyzed to determine the most likely face
shape.

Possible classifications include:

Oval

Round

Square

Heart

Oblong

Step 4: Confidence Calculation

The system calculates a confidence/match score for the detected face
shape and presents the strongest result to the user.

Step 5: Frame Recommendation

The recommendation engine maps the detected face shape to suitable
eyeglass frame styles.

For example:

Face Shape   Recommended Frames

Oval         Most frame styles, including square and rectangular
Round        Square, rectangular and wider frames
Square       Round, oval and softer frames
Heart        Aviator, round and balanced frames
Oblong       Wide, deep and oversized frames

These recommendations are intended as style guidance rather than medical
or optical advice.

Technology Stack

The project can be maintained as a modern web application using:

Frontend: React

Language: TypeScript / JavaScript

Styling: CSS / modern responsive UI

Computer Vision: Face and facial-landmark analysis

Backend / Data Layer: Application API and database services

Database: User, prediction, upload and activity records

Deployment: Vercel or another compatible web-hosting platform

The exact libraries and services should match the dependencies
configured in the project source code.

Main Application Pages

User Page

The user-facing interface provides:

Photo upload

Live camera option

Face analysis

Face shape result

Confidence score

Frame recommendation

Frame library

Save and reset controls

Admin Dashboard

The administration interface provides:

Dashboard statistics

Daily login chart

User activity trend

User management

Image gallery

Activity feed

Account settings

Admin security controls

Project Structure

A typical project structure is:

face-shape-eyeglass/
│
├── public/
│   └── static assets
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   ├── assets/
│   ├── App.*
│   └── main.*
│
├── package.json
├── package-lock.json
├── vite.config.*
├── tsconfig.json
└── README.md

The exact structure may vary depending on the implementation.

Installation

Prerequisites

Install:

Node.js

npm

Check the installation:

node --version
npm --version

Clone the Project

git clone <your-github-repository-url>
cd face-shape-eyeglass

Install Dependencies

npm install

Start Development Server

npm run dev

Open the local URL displayed by the development server.

Production Build

Create a production build:

npm run build

Preview the production build locally:

npm run preview

Before deployment, verify that:

All required environment variables are configured.

The database/API connection is available.

Camera permissions work in the browser.

Image upload and analysis work correctly.

Admin authentication works correctly.

Deployment

The application can be deployed using a modern web-hosting service such
as Vercel.

General deployment process:

GitHub Repository
       |
       v
Connect Repository
       |
       v
Configure Environment Variables
       |
       v
Build Project
       |
       v
Deploy
       |
       v
Production Application

Do not place private API keys, database passwords, or service
credentials directly in source code.

Face Shape Recommendation Logic

The recommendation system uses facial proportions and shape
characteristics to determine suitable frame categories.

A simplified recommendation flow is:

Facial Measurements
        |
        v
Face Shape Score
        |
        v
Highest-Scoring Shape
        |
        v
Frame Compatibility Rules
        |
        v
Recommended Frames

The system can be extended in the future with a trained machine-learning
model or a larger labeled face-shape dataset to improve classification
accuracy.

Security Considerations

For a production deployment:

Store passwords securely using proper password hashing.

Never expose private database credentials in frontend code.

Validate uploaded file types and file sizes.

Restrict administrative functionality to authorized users.

Protect API/database operations with authentication and
authorization.

Avoid storing unnecessary facial images or personal information.

Use HTTPS in production.

Sanitize user-provided data.

Implement appropriate database access policies.

Testing Checklist

Before submitting or demonstrating the project, test:

User

User can open the application.

Photo upload works.

Invalid file types are handled.

Face analysis works.

Face shape is displayed.

Confidence score is displayed.

Frame recommendations are displayed.

Frame library works.

Reset works.

Live camera works when browser permissions are granted.

Admin

Admin login works.

Dashboard statistics load.

User list loads.

Image records load.

Prediction records load.

Activity feed loads.

Charts display correctly.

User management actions work.

Admin settings work.

Password update works securely.

Deployment

Production build succeeds.

Environment variables are configured.

No console errors remain.

No broken links remain.

Application works on desktop and mobile.

Authentication and database access work in production.

Future Enhancements

Possible future improvements include:

More accurate AI face-shape classification

Personalized frame recommendations

Virtual try-on using augmented reality

Multiple face detection

Real-time camera analysis

Frame color recommendations

Frame size recommendations

Gender-neutral styling recommendations

Online eyewear catalog integration

User recommendation history

AI-based frame ranking

Mobile application

Analytics and recommendation performance reports

Advantages

Easy-to-use interface.

Reduces the difficulty of selecting suitable frame styles.

Provides personalized recommendations.

Combines computer vision with a practical real-world application.

Includes both user and administrative functionality.

Can be extended into an online eyewear shopping or virtual try-on
platform.

Limitations

Face-shape classification can be affected by image angle, lighting,
facial hair, glasses, and image quality.

Recommendations are style suggestions and do not replace
professional optical advice.

Results may vary depending on the accuracy of facial measurement and
classification.

A larger and more diverse dataset can improve a machine-learning
implementation.

Team Members

Role

Name

Team Lead

Kasim Vali

Team Member

Chinna Venkat

Team Member

Pavan

Project Information

Project Title: Face Shape-Based Smart Eyeglass Recommendation System

Project Type: AI / Computer Vision / Web Application

Primary Purpose: Personalized eyeglass frame recommendation based on
facial shape.

Modules: User Module + Admin Module

License

This project is intended for academic and educational use. Add an
appropriate open-source or project-specific license if the project will
be distributed publicly.

Author

This project was developed by the team listed above as an academic project.

Project Team

Team Lead: Kasim Vali

Team Member: Chinna Venkat

Team Member: pavan
