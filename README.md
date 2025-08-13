# 📈 Free Backtesting Web App for Day Traders

A web application that helps day traders test and refine their strategies using historical data — completely free, with zero paywalls. Place trades, journal your results, and get AI-powered trading advice — all in one platform.

---

## 🚀 Features

- 🕹️ **Interactive Backtesting Engine**  
  Simulate buy/sell stop orders on historical charts.

- 📒 **Trade Journal**  
  Write notes, tag trades, and review your thought process.

- 📊 **Performance Metrics (Coming Soon)**  
  Analyze win rate, risk-to-reward, and consistency.

- 🤖 **AI-Powered Trading Assistant**  
  Get intelligent trading recommendations and insights

- � **Advanced Analytics**  
  Detailed performance metrics and reporting

- 💸 **100% Free**  
  No subscriptions, no locked features — accessible to everyone.

---

## 🧱 Tech Stack

**Frontend:**

- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Chart.js for data visualization
- **Deployed on Vercel**

**Backend:**

- FastAPI (Python)
- PostgreSQL database
- SQLAlchemy ORM
- JWT Authentication
- **Deployed on Railway**

**AI Integration (Planned):**

- OpenAI API integration for trading insights

---

## 🗂️ Project Structure

```
BKST/
├── bskt_app/                   # Frontend React app
│   ├── src/                    # React components and pages
│   │   ├── pages/             # Application pages
│   │   ├── assets/            # Static assets
│   │   └── ...                # Other React files
│   ├── server/                 # FastAPI backend
│   │   ├── app/               # API routes and models
│   │   ├── alembic/           # Database migrations
│   │   └── sql_app.db         # SQLite database (local)
│   └── package.json           # Frontend dependencies
├── railway.toml               # Railway deployment config
├── .railwayignore            # Railway ignore rules
├── requirements.txt          # Backend dependencies
└── README.md                 # Project documentation
```

---

## 🚀 Deployment

### Frontend (Vercel)

- Automatically deploys from main branch
- Environment variable: `VITE_API_URL` points to Railway backend
- Build command: `npm run build`
- Output directory: `dist`

### Backend (Railway)

- Automatically deploys from main branch
- Includes PostgreSQL database
- Serves API endpoints
- Start command: `cd bskt_app/server && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 📝 API Endpoints

- `POST /signup` - User registration
- `POST /login` - User authentication
- `GET /sessions` - Retrieve user sessions
- `POST /sessions` - Create new trading session
- `GET /docs` - Interactive API documentation (Swagger UI)

---

## 👤 Author

**TradeStack-Tyron**

- GitHub: [@TradeStack-Tyron](https://github.com/TradeStack-Tyron)
- Repository: [BKST](https://github.com/TradeStack-Tyron/BKST)
