# Contributing to SIGB UdM

Thank you for your interest in contributing to the SIGB UdM project!

## Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd sigb-udm
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

4. **Setup database**
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE bibliotheque_cameroun;"

# Import schema and data
mysql -u root -p bibliotheque_cameroun < database/bibliotheque_cameroun.sql
```

5. **Start development server**
```bash
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic

## Testing

Run the test scripts to verify your changes:

```bash
# Test API authentication
node scripts/test-api-auth.js

# Test activities API
node scripts/test-activities-api.js

# Run comprehensive tests
node "scripts/test fonctionnalites SIGB UdM/test-suite-complete.js"
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test your changes
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Database Changes

If you need to modify the database schema:

1. Update the SQL file in `database/bibliotheque_cameroun.sql`
2. Test the changes locally
3. Document the changes in your PR

## API Changes

When adding new API endpoints:

1. Add the route in `src/app/api/`
2. Use proper validation with Zod schemas
3. Add error handling
4. Test the endpoint with the test scripts

## UI Changes

For frontend changes:

1. Use existing components from `src/components/ui/`
2. Follow the design system (Tailwind CSS + Shadcn/ui)
3. Ensure responsive design
4. Test on different screen sizes

## Questions?

If you have questions, please open an issue or contact the development team.
