import { HashRouter, Routes, Route } from 'react-router-dom';
import AuthGate from './components/auth/AuthGate';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './components/dashboard/DashboardPage';
import MonthlyEntryPage from './components/entry/MonthlyEntryPage';
import BudgetPage from './components/budget/BudgetPage';
import ReportPage from './components/report/ReportPage';
import CreditCardPage from './components/card/CreditCardPage';
import SearchPage from './components/search/SearchPage';

function App() {
  return (
    <AuthGate>
      <HashRouter>
        <div className="flex min-h-screen flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
          <Sidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <Header />
            <main className="flex-1 p-4 md:p-6">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/entry" element={<MonthlyEntryPage />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/card" element={<CreditCardPage />} />
                <Route path="/search" element={<SearchPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </AuthGate>
  );
}

export default App;
