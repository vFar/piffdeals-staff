import { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Spin } from 'antd';
import {
  BarChart,
  PieChart,
} from '@mui/x-charts';
import DashboardLayout from '../components/DashboardLayout';
import { useUserRole } from '../hooks/useUserRole';
import { useInvoiceData } from '../contexts/InvoiceDataContext';

const { Title, Text } = Typography;

const SalesAnalytics = () => {
  const { userProfile, isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const { invoices, loading: invoicesLoading, getPaidInvoices } = useInvoiceData();
  
  const [analyticsData, setAnalyticsData] = useState({
    monthlySalesData: [],
    monthlyTarget: 20000,
    monthlyTargetProgress: 0,
    monthlyIncome: 0,
  });

  useEffect(() => {
    document.title = 'Pārdošanas analītika | Piffdeals';
  }, []);

  // Calculate analytics data from shared invoice context
  const calculateAnalyticsData = useCallback(() => {
    if (!invoices || invoices.length === 0) {
      return;
    }

    const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];

    // Monthly sales data (last 12 months)
    const monthlySalesData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 1);
      
      const monthPaid = paidInvoices.filter(inv => {
        const paidDate = new Date(inv.paid_date || inv.updated_at);
        return paidDate >= monthStart && paidDate < monthEnd;
      });

      const monthIncome = monthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
      const monthName = monthStart.toLocaleDateString('lv-LV', { month: 'short' });
      monthlySalesData.push({ month: monthName, income: monthIncome });
    }

    // Current month income
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const currentMonthPaid = paidInvoices.filter(inv => {
      const paidDate = new Date(inv.paid_date || inv.updated_at);
      return paidDate >= currentMonth && paidDate < nextMonth;
    });
    const monthlyIncome = currentMonthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

    const monthlyTarget = 20000;
    const monthlyTargetProgress = monthlyTarget > 0
      ? (monthlyIncome / monthlyTarget) * 100
      : 0;

    setAnalyticsData({
      monthlySalesData,
      monthlyTarget,
      monthlyTargetProgress,
      monthlyIncome,
    });
  }, [invoices]);

  // Recalculate when invoices change
  useEffect(() => {
    if (invoices && invoices.length > 0) {
      calculateAnalyticsData();
    }
  }, [invoices, calculateAnalyticsData]);

  if (roleLoading || invoicesLoading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  // Radial progress data for target chart
  const radialData = [
    { id: 0, value: Math.min(analyticsData.monthlyTargetProgress, 100), label: 'Progress', color: '#0068FF' },
    { id: 1, value: Math.max(100 - analyticsData.monthlyTargetProgress, 0), label: 'Atlikušais', color: 'rgba(228, 231, 236, 0.85)' },
  ];

  return (
    <DashboardLayout>
      <div className="analytics-container">
        <div className="analytics-header">
          <Title level={1} className="analytics-title">
            Pārdošanas analītika
          </Title>
          <Text className="analytics-subtitle">
            Detalizēta pārdošanas analītika un mērķu izpilde
          </Text>
        </div>

        <div className="analytics-grid">
          {/* Monthly Sales Chart */}
          <div className="analytics-chart-section">
            <Card className="analytics-card">
              <div className="analytics-card-header">
                <h3 className="analytics-card-title">Mēneša pārdošana</h3>

              </div>
              <div className="analytics-chart-content">
                {analyticsData.monthlySalesData.length > 0 ? (
                  <BarChart
                    width={undefined}
                    height={250}
                    series={[
                      {
                        data: analyticsData.monthlySalesData.map(d => Math.max(0, d.income)),
                        label: 'Ienākumi (€)',
                      },
                    ]}
                    xAxis={[{
                      scaleType: 'band',
                      data: analyticsData.monthlySalesData.map(d => d.month),
                    }]}
                    yAxis={[{
                      min: 0,
                    }]}
                    colors={['#0068FF']}
                    sx={{
                      width: '100%',
                      '& .MuiBarElement-root': {
                        borderRadius: '6px 6px 0 0',
                      },
                    }}
                  />
                ) : (
                  <div className="analytics-no-data">Pagaidām nav datu...</div>
                )}
              </div>
            </Card>
          </div>

          {/* Monthly Target Chart */}
          <div className="analytics-target-section">
            <Card className="analytics-target-card">
              <div className="analytics-target-inner">
                <div className="analytics-card-header">
                  <div className="analytics-target-header-text">
                    <h3 className="analytics-card-title">Mēneša mērķis</h3>
                    <p className="analytics-card-description">
                      Mērķis, ko esat noteicis katram mēnesim
                    </p>
                  </div>

                </div>
                <div className="analytics-target-chart-wrapper">
                  <div className="analytics-target-chart">
                    <PieChart
                      series={[
                        {
                          data: radialData,
                          innerRadius: 60,
                          outerRadius: 80,
                          paddingAngle: 0,
                        },
                      ]}
                      width={200}
                      height={180}
                    />
                    <div className="analytics-target-percentage">
                      {analyticsData.monthlyTargetProgress.toFixed(1)}%
                    </div>
                  </div>
                  {analyticsData.monthlyIncome > analyticsData.monthlyTarget && (
                    <div className="analytics-target-badge">
                      +{((analyticsData.monthlyIncome / analyticsData.monthlyTarget) * 100 - 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="analytics-target-message">
                  Jūs nopelnījāt €{analyticsData.monthlyIncome.toFixed(2)} šodien, tas ir augstāk nekā pagājušajā mēnesī. Turpiniet labo darbu!
                </p>
                <div className="analytics-target-stats">
                  <div className="analytics-target-stat">
                    <p className="analytics-target-stat-label">Mērķis</p>
                    <p className="analytics-target-stat-value">
                      €{analyticsData.monthlyTarget.toLocaleString()}
                    </p>
                  </div>
                  <div className="analytics-target-divider"></div>
                  <div className="analytics-target-stat">
                    <p className="analytics-target-stat-label">Ienākumi</p>
                    <p className="analytics-target-stat-value">
                      €{analyticsData.monthlyIncome.toFixed(0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Responsive Styles */}
      <style>{`
        .analytics-container {
          padding: 16px 20px 80px;
          max-width: 1536px;
          margin: 0 auto;
        }

        .analytics-header {
          margin-bottom: 32px;
        }

        .analytics-title {
          margin: 0 !important;
          font-size: 30px !important;
          font-weight: 700 !important;
          color: #212B36 !important;
          line-height: 1.2 !important;
        }

        .analytics-subtitle {
          font-size: 16px;
          color: #637381;
          line-height: 1.5;
          margin-top: 8px;
          display: block;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        .analytics-card .ant-card-body {
          padding: 20px 24px;
        }

        .analytics-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }

        .analytics-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .analytics-card-title {
          font-size: 18px;
          font-weight: 600;
          color: #212B36;
          margin: 0;
        }

        .analytics-card-description {
          font-size: 14px;
          color: #637381;
          margin: 4px 0 0 0;
        }

        .analytics-card-menu-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #637381;
          flex-shrink: 0;
        }

        .analytics-chart-content {
          height: 250px;
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .analytics-no-data {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 16px;
          font-weight: 500;
        }

        .analytics-target-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #f1f5f9;
          overflow: hidden;
        }

        .analytics-target-card .ant-card-body {
          padding: 0;
        }

        .analytics-target-inner {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }

        .analytics-target-header-text {
          flex: 1;
          min-width: 0;
        }

        .analytics-target-chart-wrapper {
          position: relative;
          margin-top: 24px;
        }

        .analytics-target-chart {
          height: 180px;
          position: relative;
          display: flex;
          align-items: center;
          justifycontent: center;
          width: 100%;
          overflow: hidden;
        }

        .analytics-target-percentage {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          font-size: 36px;
          font-weight: 600;
          color: #212B36;
          line-height: 1;
        }

        .analytics-target-badge {
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%) translateY(-95%);
          background: #dcfce7;
          color: #166534;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
        }

        .analytics-target-message {
          margin-top: 40px;
          text-align: center;
          font-size: 14px;
          color: #637381;
          max-width: 380px;
          margin-left: auto;
          margin-right: auto;
        }

        .analytics-target-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .analytics-target-stat {
          text-align: center;
        }

        .analytics-target-stat-label {
          margin: 0 0 4px 0;
          font-size: 12px;
          color: #637381;
        }

        .analytics-target-stat-value {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #212B36;
        }

        .analytics-target-divider {
          width: 1px;
          height: 28px;
          background: #e2e8f0;
        }

        /* Mobile Responsive (< 576px) */
        @media (max-width: 575px) {
          .analytics-container {
            padding: 12px 16px 60px;
          }

          .analytics-header {
            margin-bottom: 24px;
          }

          .analytics-title {
            font-size: 24px !important;
          }

          .analytics-subtitle {
            font-size: 14px;
          }

          .analytics-card .ant-card-body {
            padding: 16px;
          }

          .analytics-card-header {
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 8px;
          }

          .analytics-card-title {
            font-size: 16px;
          }

          .analytics-card-description {
            font-size: 13px;
          }

          .analytics-chart-content {
            height: 250px;
          }

          .analytics-no-data {
            font-size: 14px;
          }

          .analytics-target-inner {
            padding: 16px;
          }

          .analytics-target-chart-wrapper {
            margin-top: 20px;
          }

          .analytics-target-chart {
            height: 160px;
          }

          .analytics-target-percentage {
            font-size: 28px;
          }

          .analytics-target-badge {
            font-size: 10px;
          }

          .analytics-target-message {
            margin-top: 24px;
            font-size: 12px;
            padding: 0 8px;
          }

          .analytics-target-stats {
            gap: 16px;
            flex-wrap: wrap;
          }

          .analytics-target-stat-label {
            font-size: 11px;
          }

          .analytics-target-stat-value {
            font-size: 16px;
          }
        }

        /* Tablet Responsive (576px - 991px) */
        @media (min-width: 576px) and (max-width: 991px) {
          .analytics-card .ant-card-body {
            padding: 18px 20px;
          }

          .analytics-card-title {
            font-size: 17px;
          }

          .analytics-chart-content {
            height: 280px;
          }

          .analytics-target-chart {
            height: 170px;
          }

          .analytics-target-percentage {
            font-size: 32px;
          }
        }

        /* Desktop (≥ 1280px) */
        @media (min-width: 1280px) {
          .analytics-grid {
            grid-template-columns: 7fr 5fr;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default SalesAnalytics;
