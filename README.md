# SIGB UdM - Library Management System

A modern library management system built for the University of Mountains (UdM) in Cameroon.

## Features

- 📚 **Books Management** - Complete catalog with detailed metadata
- 🎓 **Theses & Dissertations** - Academic documents archive
- 📝 **Reports Management** - Student reports and internship documents
- 👥 **User Management** - Students and staff accounts
- 📖 **Loans & Returns** - Borrowing system with due dates
- 📅 **Reservations** - Document reservation system
- 💰 **Penalties** - Automatic fine calculation
- 📊 **Statistics** - Dashboard with analytics
- 🔐 **Active Directory** - UdM authentication integration

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: MySQL 8.0
- **Authentication**: Active Directory + JWT

## Prerequisites

- Node.js 18+
- MySQL 8.0 or XAMPP
- 4GB RAM minimum

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd sigb-udm
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup database**
   - Install MySQL or XAMPP
   - Create `.env.local` file:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bibliotheque_cameroun

JWT_SECRET=your-secret-key
```

4. **Import database**
```bash
mysql -u root -p bibliotheque_cameroun < database/bibliotheque_cameroun.sql
```

5. **Start development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Structure

Main tables:
- `books` - Book catalog with metadata
- `theses` - Academic theses archive
- `memoires` - Student dissertations
- `stage_reports` - Internship reports
- `users` - Library users
- `loans` - Borrowing history
- `reservations` - Document reservations
- `penalties` - Fine management

## Usage

The system uses Active Directory authentication for UdM users.

### Main Features
- Dashboard with statistics
- Book catalog management
- Academic documents archive
- User management
- Loan tracking
- Reservation system
- Fine management
- Analytics and reports

## Deployment

### Docker
```bash
docker build -t sigb-udm .
docker-compose up -d
```

### Production Build
```bash
npm run build
npm start
```

## Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is developed for the University of Mountains (UdM) in Cameroon.

## Contact

University of Mountains - [udm.edu.cm](https://udm.edu.cm)
