# Product Requirements Document (PRD)

Product Name: Tribbai  
Document Owner: \[Sérgio Gonçalves\]  
Version: 1.0  
Last Updated: \[Date\]  
---

## 1\. Overview

### 1.1 Product Vision

Tribbai is an AI-powered app that enables users to create, customize, and interact with AI roles (GPTs) individually or in team chats. The app allows AI roles to collaborate, complement each other’s responses, and retain memory across chats, providing users with a dynamic and intelligent conversational experience.

### 1.2 Key Features

1. AI Role Management: Create, edit, and use pre-made AI roles.  
2. Individual and Team Chats: Chat with AI roles individually or in a group setting.  
3. Role Collaboration: AI roles can complement each other’s answers in team chats.  
4. Tagging System: Users can tag specific roles to respond, and roles can tag each other for follow-ups.  
5. Memory Integration: AI roles retain context and information from current and previous chats using Supabase and Llongterm integration.  
6. Central Role Manager (Orchestrator): Manages the flow of conversation in team chats when no specific role is tagged.

---

## 2\. Target Audience

* Professionals: Marketing experts, financial advisors, life coaches, etc., who need specialized AI assistance.  
* Enthusiasts: Users interested in exploring AI roles for personal growth or entertainment.

## 2.1 Use Cases

### 2.1.1. Wellness & Personal Growth

Roles:

1. Life Coach: Helps set goals, track progress, and stay accountable.  
2. Mindfulness Guide: Teaches meditation techniques and stress management.  
3. Motivational Buddy: Sends uplifting messages and keeps you inspired.  
4. Fitness Trainer: Designs workout plans and tracks fitness milestones.

How They Collaborate:

* The Life Coach sets a goal (e.g., “Run a 5K in 3 months”).  
* The Fitness Trainer creates a workout plan.  
* The Mindfulness Guide suggests breathing exercises for stress.  
* The Motivational Buddy chimes in with encouragement: “You’ve got this\! Remember why you started.”

### 2.1.2 Entrepreneurship & Startups

Roles:

1. Pitch Coach: Refines your investor pitch and answers tough questions.  
2. Marketing Strategist: Brainstorms campaigns and analyzes trends.  
3. Financial Advisor: Helps with budgeting, forecasting, and financial planning.  
4. Product Manager: Guides product development and prioritizes features.

How They Collaborate:

* The Pitch Coach helps craft a compelling pitch.  
* The Financial Advisor ensures the numbers are solid.  
* The Marketing Strategist suggests ways to position the product.  
* The Product Manager flags potential risks: “Let’s prioritize this feature for the MVP.”

### 2.1.3 Education & Learning

Roles:

1. Study Partner: Explains complex topics and quizzes you on key concepts.  
2. Language Tutor: Helps with vocabulary, grammar, and conversation practice.  
3. Research Assistant: Summarizes articles and finds credible sources.  
4. Time Management Coach: Helps you plan study schedules and avoid procrastination.

How They Collaborate:

* The Study Partner explains a difficult concept (e.g., quantum physics).  
* The Research Assistant finds a simplified article for further reading.  
* The Language Tutor helps translate key terms if needed.  
* The Time Management Coach reminds you: “Take a 5-minute break after this section.”

### 2.1.4 Creative Projects

Roles:

1. Storyteller: Brainstorms plot twists and character arcs.  
2. Art Critic: Provides feedback on your creative work.  
3. Music Mentor: Suggests chord progressions and songwriting tips.  
4. Creative Strategist: Helps align your project with your goals (e.g., audience, tone).

How They Collaborate:

* The Storyteller suggests a plot twist for your novel.  
* The Art Critic reviews the scene description: “This dialogue feels a bit flat—try adding more emotion.”  
* The Music Mentor recommends a soundtrack for inspiration.  
* The Creative Strategist ensures the tone matches your target audience.

### 2.1.5. Career Development

Roles:

1. Resumé Reviewer: Optimizes your CV and LinkedIn profile.  
2. Interview Coach: Prepares you for tough interview questions.  
3. Career Counselor: Helps you navigate career transitions.  
4. Networking Guru: Suggests networking strategies and LinkedIn outreach templates.

How They Collaborate:

* The Resumé Reviewer polishes your CV.  
* The Interview Coach role-plays a mock interview.  
* The Career Counselor suggests long-term career paths.  
* The Networking Guru drafts a LinkedIn message to connect with a potential mentor.

### 2.1.6 Niche Hobbies & Interests

Roles:

1. Gaming Strategist: Tips for leveling up and beating bosses.  
2. Travel Planner: Curates itineraries and packing lists.  
3. Plant Doctor: Diagnoses plant issues and suggests care tips.  
4. DIY Advisor: Troubleshoots home projects and suggests tools.

How They Collaborate:

* The Travel Planner creates a trip itinerary.  
* The DIY Advisor suggests packing essentials for a camping trip.  
* The Plant Doctor reminds you: “Don’t forget to water your plants before you leave\!”  
* The Gaming Strategist recommends a travel-friendly game for downtime.

---

## 3\. Key User Stories

### 3.1 AI Role Management

* As a user, I want to create and customize AI roles so that I can tailor them to my needs.  
* As a user, I want to edit or delete existing AI roles so that I can manage my list of roles.  
* As a user, I want to create AI roles using AI assistance to create clear instructions for the role  
* As a user, I want to use pre-made AI role templates so that I can quickly get started.

### 3.2 Chat Functionality

* As a user, I want to chat with an AI role individually so that I can get specialized advice.  
* As a user, I want to start a team chat with multiple AI roles so that they can collaborate and provide comprehensive answers.  
* As a user, I want to tag a specific AI role in a team chat so that only that role responds.  
* As a user, I want AI roles to tag each other in team chats so that they can complement each other’s responses.  
* As a user, I want AI roles to answer according to their instructions which indicates their expertise, knowledge, behaviour and personality.

### 3.3 Memory and Context

* As a user, I want AI roles to remember the context of the current chat so that the conversation remains coherent.  
* As a user, I want AI roles to retain information and context from previous chats so that they can provide consistent and informed responses.

### 3.4 User Experience

* As a user, I want to view my chat history so that I can revisit previous conversations.  
* As a user, I want to customize the app’s theme and settings so that I can personalize my experience.

---

## 4\. Features and Functionality

### 4.1 Pages and Features

#### 1\. Landing Page (Index)

* Brief introduction to Tribbai.  
* Call-to-action buttons: “Get Started,” “SignIn”


#### 2\. Roles Page

* AI Role Cards: Display all created and pre-made AI roles.  
  * Buttons: “Edit,” “Delete,” “Start Chat.”  
* Create New Role: Button to create a new AI role with customizable parameters.  
* Pre-Made Templates: List of pre-made AI roles (e.g., Marketing Guru, Financial Advisor).

#### 3\. Chats Page

* Individual Chat: Start a chat with a single AI role.  
* Team Chat: Start a chat with multiple AI roles.  
  * Tagging: Tag a specific role to respond.  
  * Role Collaboration: Roles can tag each other for follow-ups.  
* Chat History Sidebar: Display all previous chats for easy access.

#### 4\. Settings Page

* Theme Customization: Light/dark mode, accent colors.  
* Subscription Management: View and update subscription plans.  
* User Profile: Edit user name and other personal details.

---

## 5\. Technical Requirements

### 5.1 Backend

* Central Role Manager (Orchestrator):  
  * Determines the order of responses in team chats when no role is tagged.  
  * Ensures smooth flow of conversation between AI roles.  
* Memory Integration:  
  * Use Supabase and Llongterm to store and retrieve chat history and context.  
  * Each AI role retains memory from current and previous chats.

### 5.2 Frontend

* UI/UX Design:  
  * Clean and intuitive interface for managing roles and chats.  
  * Responsive design for mobile and desktop.  
* Chat Interface:  
  * Display messages in a threaded format.  
  * Highlight tagged roles and their responses.

### 5.3 AI Integration

* GPT Models:  
  * Use GPT-based models for AI roles.  
  * Fine-tune models for specific plans (gpt4o-mini for Creator and free plan \- gpt4 for Maestro plan)  
* Tagging System:  
  * Implement logic for tagging roles in team chats.  
  * Ensure only tagged roles respond when specified.

---

## 6\. User Flows

### 6.1 Creating and Editing AI Roles

1. User navigates to the Roles Page.  
2. User clicks “Create New Role” or selects a pre-made template.  
3. User customizes the role’s parameters (name, description, behavior).  
4. User saves the role, which is added to their list of AI roles.

### 6.2 Starting a Team Chat

1. User navigates to the Chats Page.  
2. User clicks “Start New Chat” and selects multiple AI roles.  
3. User types a message and sends it.  
   * If no role is tagged, the Central Role Manager determines the order of responses.  
   * If a role is tagged, only that role responds.  
4. AI roles collaborate and tag each other as needed.

### 6.3 Using Chat History

1. User navigates to the Chats Page.  
2. User selects a previous chat from the sidebar.  
3. User views the chat history and continues the conversation.

---

## 7\. Success Metrics

* User Engagement: Number of AI roles created, chats started, and messages sent.  
* Retention: Frequency of app usage and returning users.  
* Customer Satisfaction: Positive feedback and ratings on app stores.  
* Performance: Response time of AI roles and accuracy of responses.

---

## 8\. Risks and Mitigation

* Risk: High computational cost due to multiple AI roles and memory integration.  
  * Mitigation: Optimize backend infrastructure and use efficient caching mechanisms.  
* Risk: Complexity in managing role collaboration and tagging logic.  
  * Mitigation: Thoroughly test the Central Role Manager and tagging system.  
* Risk: User confusion with multiple AI roles and their functionalities.  
  * Mitigation: Provide clear onboarding and tooltips for new users.

---

## 9\. Future Enhancements

* Role Marketplace: Allow users to share, sell, purchase and download AI roles created by others.  
* Advanced Customization: Enable users to select different LLM models for the AI roles.  
* Gamification and referral

