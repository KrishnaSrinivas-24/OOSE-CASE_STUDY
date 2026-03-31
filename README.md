# SkyPay Payment Gateway

SkyPay is a modern, web-based credit card payment gateway simulation. It features a clean, professional fintech-style UI and simulates the full transaction flow between a Merchant, Payment Gateway, and Issuing Bank.

## Features

- **Customer Payment Page**: Secure-looking UI for entering card details.
- **Processing Screen**: Realistic loading state for transaction processing.
- **Bank Decision Simulation**: Approve or decline transactions manually.
- **Success/Failure Screens**: Clear feedback on transaction outcomes.
- **Reports Dashboard**: Financial overview with volume charts.
- **Settings**: Configure gateway details and API keys.
- **Interactive Navbar**: Notifications, Help, and User Profile dropdowns.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Getting Started Locally

Follow these steps to run SkyPay on your computer:

### 1. Clone or Download the Project

If you downloaded the project as a ZIP file, extract it to a folder on your computer.

### 2. Install Dependencies

Open your terminal (Command Prompt, PowerShell, or Terminal) in the project's root directory and run:

```bash
npm install
```

### 3. Set Up Environment Variables

Create a new file named `.env` in the root directory and copy the contents from `.env.example`. 

```bash
cp .env.example .env
```

*Note: If you plan to use Gemini AI features (if implemented), you'll need to add your `GEMINI_API_KEY` to this file.*

### 4. Run the Development Server

Start the full-stack app in development mode:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`. The server handles both API routes and the Vite development server.

### 5. Build and Run for Production

To create a production-ready build and run the server:

```bash
npm run build
npm start
```

The built files will be served from the `dist/` directory by the Express server. You can also preview the production build locally with:

```bash
npm run preview
```

## Technologies Used

- **React**: UI library
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
- **Motion**: Animations

## License

This project is for demonstration purposes.
