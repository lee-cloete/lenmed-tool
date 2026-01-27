# Lenmed Doctor-Hospital Management System

A simple management system for doctors and their hospital affiliations, built with Nuxt.js and Supabase.

## Features

- User authentication (login/signup)
- Manage doctors (add, edit, delete)
- Manage hospitals (add, edit, delete)
- Link doctors to hospitals (many-to-many relationships)
- Visual relationship view (grouped by hospital or doctor)
- Search functionality
- Lenmed brand colors

## Tech Stack

- **Frontend**: Nuxt.js 3, Vue 3, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Icons**: Lucide Vue

---

## Supabase Setup Guide

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Enter a project name (e.g., "lenmed-tool")
4. Set a strong database password (save this somewhere safe)
5. Select a region close to your users
6. Click **"Create new project"**
7. Wait for the project to be created (takes about 2 minutes)

### Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** (gear icon) > **API**
2. You'll find two important values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`

### Step 3: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the SQL Editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this means the tables were created

### Step 4: Configure Authentication

1. Go to **Authentication** > **Providers** in Supabase dashboard
2. Make sure **Email** is enabled (it should be by default)
3. Optional: Go to **Authentication** > **URL Configuration**
   - Set **Site URL** to your app URL (e.g., `http://localhost:3000` for local dev)

### Step 5: Create Environment File

1. In the project root, create a `.env` file:

```bash
cp .env.example .env
```

2. Edit `.env` with your Supabase credentials:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your actual values from Step 2.

### Step 6: Run the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 7: Create Your First User

1. Go to the signup page (`/signup`)
2. Enter your email and password
3. Check your email for a confirmation link
4. Click the link to confirm your account
5. Login with your credentials

---

## Importing CSV Data

The `flume_expanded.csv` file contains doctor and hospital data. The CSV structure maps to the database as follows:

| CSV Column | Database Field |
|------------|----------------|
| Hospital Name | hospitals.name |
| Title | doctors.title |
| Dr Full Name | doctors.full_name |
| Doctors Disciplines | doctors.disciplines |
| wpcf-doctor-telephone | doctors.phone1 |
| wpcf-doctor-telephone-2 | doctors.phone2 |
| wpcf-doctor-telephone-3 | doctors.phone3 |
| wpcf-contact-email | doctors.email |
| wpcf-display-bio-link | doctors.bio_link |
| Permalink | doctors.permalink |
| Status | doctors.status |

To import the data, you can use Supabase's CSV import feature or write a custom import script.

---

## Project Structure

```
lenmed-tool/
├── app.vue                 # Main app component
├── nuxt.config.ts          # Nuxt configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── layouts/
│   └── default.vue         # Main layout with sidebar
├── middleware/
│   └── auth.ts             # Authentication middleware
├── pages/
│   ├── index.vue           # Dashboard
│   ├── login.vue           # Login page
│   ├── signup.vue          # Signup page
│   ├── doctors.vue         # Doctors management
│   ├── hospitals.vue       # Hospitals management
│   └── relationships.vue   # Doctor-Hospital relationships
├── supabase-schema.sql     # Database schema
└── flume_expanded.csv      # Sample data
```

---

## Troubleshooting

### "Invalid API key" error
- Double-check your `SUPABASE_KEY` in `.env`
- Make sure there are no extra spaces or quotes

### "relation does not exist" error
- Run the SQL schema again in Supabase SQL Editor
- Check that all tables were created in **Table Editor**

### Can't login after signup
- Check your email for the confirmation link
- In Supabase, go to **Authentication** > **Users** to see if the user was created
- You can manually confirm users in the dashboard for testing

### RLS (Row Level Security) blocking requests
- The schema includes RLS policies for authenticated users
- Make sure you're logged in before accessing data
- Check **Authentication** > **Policies** to verify policies exist

---

## Color Palette

The app uses Lenmed's official brand colors:

| Color | Hex | Usage |
|-------|-----|-------|
| Navy | #1B4681 | Primary, headers, navigation |
| Blue | #54B9E2 | Buttons, links, accents |
| Green | #A5CC79 | Success states, highlights |
| Grey | #4B4C4D | Body text, secondary elements |
| White | #FFFFFF | Backgrounds |

---

## License

Private - Lenmed
