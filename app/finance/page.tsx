'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowLeft, CreditCard, PiggyBank, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FinancialData {
  id?: number;
  month: string; // YYYY-MM format
  creditCardBill: number;
  notes?: string;
}

export default function FinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [currentBill, setCurrentBill] = useState('');
  const [notes, setNotes] = useState('');

  // Financial constants
  const biweeklyPaycheck = 3012.89;
  const monthlyIncome = biweeklyPaycheck * 26 / 12; // Convert biweekly to monthly
  const rent = 2300;
  const savings = 1000;
  const creditCardLimit = 2000;

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      const response = await fetch('/api/finance');
      if (response.ok) {
        const data = await response.json();
        setFinancialData(data.finances || []);
        
        // Set current month data if it exists
        const currentData = data.finances.find((f: FinancialData) => f.month === currentMonth);
        if (currentData) {
          setCurrentBill(currentData.creditCardBill.toString());
          setNotes(currentData.notes || '');
        }
      }
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFinancialData = async () => {
    if (!currentBill.trim()) return;

    try {
      const response = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          creditCardBill: parseFloat(currentBill),
          notes: notes.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFinancialData(prev => {
          const existing = prev.find(f => f.month === currentMonth);
          if (existing) {
            return prev.map(f => f.month === currentMonth ? data.finance : f);
          } else {
            return [...prev, data.finance].sort((a, b) => b.month.localeCompare(a.month));
          }
        });
      }
    } catch (error) {
      console.error('Failed to save financial data:', error);
    }
  };

  const navigateMonth = (direction: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);

    // Load data for new month
    const monthData = financialData.find(f => f.month === newMonth);
    if (monthData) {
      setCurrentBill(monthData.creditCardBill.toString());
      setNotes(monthData.notes || '');
    } else {
      setCurrentBill('');
      setNotes('');
    }
  };

  const getMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const calculateStats = () => {
    const currentData = financialData.find(f => f.month === currentMonth);
    const currentBillAmount = currentData?.creditCardBill || parseFloat(currentBill) || 0;
    
    const remainingBudget = creditCardLimit - currentBillAmount;
    const totalExpenses = rent + currentBillAmount + savings;
    const remainingIncome = monthlyIncome - totalExpenses;
    
    const lastMonthData = financialData
      .filter(f => f.month < currentMonth)
      .sort((a, b) => b.month.localeCompare(a.month))[0];

    const trend = lastMonthData ? currentBillAmount - lastMonthData.creditCardBill : 0;

    return {
      currentBillAmount,
      remainingBudget,
      totalExpenses,
      remainingIncome,
      trend,
      isOverBudget: currentBillAmount > creditCardLimit,
      budgetProgress: (currentBillAmount / creditCardLimit) * 100
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="mx-auto mb-4 text-green-600" size={48} />
          <p className="text-gray-600">Loading your finances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
              <DollarSign className="text-green-600" />
              Financial Planning
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm sm:text-lg"
              >
                ←
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="text-green-600" size={20} />
                <span className="text-sm sm:text-lg font-medium">{getMonthDisplay(currentMonth)}</span>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm sm:text-lg"
              >
                →
              </button>
            </div>
          </div>
        </div>
        <p className="text-gray-600">Keep that credit card under $2,000! 💳</p>
      </div>

      {/* Current Month Input */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard className="text-red-600" />
          {getMonthDisplay(currentMonth)} Credit Card Bill
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credit Card Bill Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="number"
                value={currentBill}
                onChange={(e) => setCurrentBill(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                step="0.01"
              />
            </div>
            <p className={`text-sm mt-1 ${stats.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              Target: Under $2,000 ({stats.isOverBudget ? 'OVER BUDGET!' : 'On track'})
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this month's spending..."
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-vertical"
              rows={3}
            />
          </div>
        </div>

        <button
          onClick={saveFinancialData}
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Save Month Data
        </button>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Income</p>
              <p className="text-2xl font-bold text-green-600">
                ${monthlyIncome.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">$3,012.89 biweekly</p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Credit Card Bill</p>
              <p className={`text-2xl font-bold ${stats.isOverBudget ? 'text-red-600' : 'text-blue-600'}`}>
                ${stats.currentBillAmount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.trend !== 0 && (
                  <span className={stats.trend > 0 ? 'text-red-500' : 'text-green-500'}>
                    {stats.trend > 0 ? '+' : ''}${stats.trend.toFixed(2)} vs last month
                  </span>
                )}
              </p>
            </div>
            <CreditCard className={stats.isOverBudget ? 'text-red-600' : 'text-blue-600'} size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Budget Remaining</p>
              <p className={`text-2xl font-bold ${stats.remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${stats.remainingBudget.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.budgetProgress.toFixed(1)}% of $2,000 limit
              </p>
            </div>
            <div className={stats.remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}>
              {stats.remainingBudget < 0 ? <TrendingDown size={32} /> : <PiggyBank size={32} />}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Income</p>
              <p className={`text-2xl font-bold ${stats.remainingIncome < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${stats.remainingIncome.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">After all expenses</p>
            </div>
            <div className={stats.remainingIncome < 0 ? 'text-red-600' : 'text-green-600'}>
              {stats.remainingIncome < 0 ? <TrendingDown size={32} /> : <TrendingUp size={32} />}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Credit Card Budget Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div 
            className={`h-4 rounded-full transition-all ${
              stats.budgetProgress > 100 
                ? 'bg-red-500' 
                : stats.budgetProgress > 80 
                  ? 'bg-yellow-500' 
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, stats.budgetProgress)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>$0</span>
          <span className={stats.isOverBudget ? 'text-red-600 font-bold' : ''}>
            ${stats.currentBillAmount.toFixed(2)} / $2,000
          </span>
          <span>$2,000</span>
        </div>
      </div>

      {/* Monthly History */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly History</h3>
        
        {financialData.length === 0 ? (
          <p className="text-gray-500 italic">No financial data recorded yet</p>
        ) : (
          <div className="space-y-3">
            {financialData
              .sort((a, b) => b.month.localeCompare(a.month))
              .slice(0, 6)
              .map((data) => {
                const isOverBudget = data.creditCardBill > creditCardLimit;
                return (
                  <div key={data.month} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-800">{getMonthDisplay(data.month)}</h4>
                      {data.notes && (
                        <p className="text-sm text-gray-600">{data.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                        ${data.creditCardBill.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isOverBudget ? 'Over budget' : 'On track'}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}