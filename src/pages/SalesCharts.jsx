import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Typography, Spin, Table, Button } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import {
  BarChart,
  LineChart,
  PieChart,
} from '@mui/x-charts';
import DashboardLayout from '../components/DashboardLayout';
import { useUserRole } from '../hooks/useUserRole';
import { useInvoiceData } from '../contexts/InvoiceDataContext';

const { Title, Text } = Typography;

const SalesCharts = () => {
  const { userProfile, isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const { invoices, loading: invoicesLoading, getPaidInvoices } = useInvoiceData();
  const [timePeriod, setTimePeriod] = useState('monthly');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const [chartData, setChartData] = useState({
    monthlySalesData: [],
    monthlyTarget: 20000,
    monthlyTargetProgress: 0,
    monthlyIncome: 0,
    statisticsData: { sales: [], revenue: [] },
    recentOrders: [],
  });

  useEffect(() => {
    document.title = 'Pārdošanas grafiki | Piffdeals';
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate chart data from shared invoice context
  const calculateChartData = useCallback(() => {
    if (!invoices || invoices.length === 0) {
      return;
    }

    const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];

    // Monthly sales data for bar chart (last 12 months)
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

    // Monthly target and progress
    const monthlyTarget = 20000;
    const monthlyTargetProgress = monthlyTarget > 0
      ? (monthlyIncome / monthlyTarget) * 100
      : 0;

    // Statistics data for area chart (last 12 months: Sales and Revenue)
    const statisticsData = { sales: [], revenue: [] };
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 1);
      
      const monthPaid = paidInvoices.filter(inv => {
        const paidDate = new Date(inv.paid_date || inv.updated_at);
        return paidDate >= monthStart && paidDate < monthEnd;
      });

      const monthIncome = monthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
      const monthCount = invoices?.filter(inv => {
        const createdDate = new Date(inv.created_at);
        return createdDate >= monthStart && createdDate < monthEnd;
      }).length || 0;
      
      const monthName = monthStart.toLocaleDateString('lv-LV', { month: 'short' });
      statisticsData.sales.push({ month: monthName, value: monthCount });
      statisticsData.revenue.push({ month: monthName, value: monthIncome });
    }

    // Recent orders (latest 5 invoices)
    const recentOrders = invoices
      ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((inv, idx) => ({
        key: idx,
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name,
        total: inv.total,
        status: inv.status,
        created_at: inv.created_at,
      })) || [];

    setChartData({
      monthlySalesData,
      monthlyTarget,
      monthlyTargetProgress,
      monthlyIncome,
      statisticsData,
      recentOrders,
    });
  }, [invoices]);

  // Recalculate when invoices change
  useEffect(() => {
    if (invoices && invoices.length > 0) {
      calculateChartData();
    }
  }, [invoices, calculateChartData]);

  // Prepare statistics data based on time period
  const getStatisticsData = () => {
    if (timePeriod === 'monthly') {
      return {
        sales: chartData.statisticsData.sales.slice(-12),
        revenue: chartData.statisticsData.revenue.slice(-12),
      };
    } else if (timePeriod === 'quarterly') {
      return {
        sales: chartData.statisticsData.sales.filter((_, i) => i % 3 === 0).slice(-4),
        revenue: chartData.statisticsData.revenue.filter((_, i) => i % 3 === 0).slice(-4),
      };
    } else {
      return {
        sales: chartData.statisticsData.sales,
        revenue: chartData.statisticsData.revenue,
      };
    }
  };

  const statisticsDataToShow = getStatisticsData();
  const combinedStatisticsData = statisticsDataToShow.sales.map((sale, idx) => ({
    month: sale.month,
    sales: sale.value,
    revenue: statisticsDataToShow.revenue[idx]?.value || 0,
  }));

  // Recent Orders Table Columns
  const orderColumns = [
    {
      title: 'Produkts',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            background: '#EBF3FF', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: '12px', fontWeight: 600, color: '#0068FF' }}>
              #{text?.toString().replace(/^#+/, '') || ''}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '14px', fontWeight: 500, color: '#212B36', display: 'block' }}>
              {record.customer_name || 'Nav norādīts'}
            </Text>
            <Text style={{ fontSize: '12px', color: '#637381' }}>Rēķins</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Kategorija',
      dataIndex: 'total',
      key: 'total',
      render: (text) => (
        <Text style={{ color: '#637381', fontSize: '14px' }}>
          €{parseFloat(text || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Cena',
      dataIndex: 'total',
      key: 'price',
      render: (text) => (
        <Text style={{ color: '#637381', fontSize: '14px' }}>
          €{parseFloat(text || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Statuss',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusStyles = {
          draft: { background: '#f3f4f6', color: '#4b5563', text: 'Melnraksts' },
          sent: { background: '#dbeafe', color: '#1e40af', text: 'Nosūtīts' },
          paid: { background: '#dcfce7', color: '#166534', text: 'Apmaksāts' },
          pending: { background: '#fef3c7', color: '#92400e', text: 'Gaida' },
          overdue: { background: '#fee2e2', color: '#991b1b', text: 'Kavēts' },
          cancelled: { background: '#f3f4f6', color: '#4b5563', text: 'Atcelts' },
        };
        const style = statusStyles[status] || statusStyles.pending;
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 500,
            background: style.background,
            color: style.color,
          }}>
            {style.text}
          </span>
        );
      },
    },
  ];

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
    { id: 0, value: Math.min(chartData.monthlyTargetProgress, 100), label: 'Progress', color: '#0068FF' },
    { id: 1, value: Math.max(100 - chartData.monthlyTargetProgress, 0), label: 'Atlikušais', color: 'rgba(228, 231, 236, 0.85)' },
  ];

  // Responsive breakpoints
  const isMobile = windowWidth < 576;
  const isTablet = windowWidth >= 576 && windowWidth < 992;
  const isSmallLaptop = windowWidth >= 992 && windowWidth < 1280;

  return (
    <DashboardLayout>
      <div style={{ 
        padding: isMobile ? '12px 16px 60px' : isTablet ? '16px 20px 80px' : '16px 20px 80px', 
        maxWidth: '1536px', 
        margin: '0 auto'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(12, 1fr)', 
          gap: '16px 24px'
        }}>
          {/* Left Column */}
          <div style={{ 
            gridColumn: 'span 12',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
          className="left-column"
          >
            {/* Monthly Sales Chart */}
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                padding: isMobile ? '16px' : isTablet ? '18px 20px' : '20px 24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: isMobile ? '16px' : '20px',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: isMobile ? '8px' : '0',
              }}>
                <h3 style={{ 
                  fontSize: isMobile ? '16px' : isTablet ? '17px' : '18px', 
                  fontWeight: 600, 
                  color: '#212B36', 
                  margin: 0 
                }}>
                  Mēneša pārdošana
                </h3>
              </div>
              <div style={{ 
                height: isMobile ? '250px' : isTablet ? '220px' : '195px', 
                position: 'relative' 
              }}>
                {chartData.monthlySalesData.length > 0 ? (
                  <BarChart
                    width={undefined}
                    height={isMobile ? 250 : isTablet ? 220 : 195}
                    series={[
                      {
                        data: chartData.monthlySalesData.map(d => Math.max(0, d.income)),
                        label: 'Ienākumi (€)',
                      },
                    ]}
                    xAxis={[{
                      scaleType: 'band',
                      data: chartData.monthlySalesData.map(d => d.month),
                    }]}
                    yAxis={[{
                      min: 0,
                    }]}
                    colors={['#0068FF']}
                    sx={{
                      '& .MuiBarElement-root': {
                        borderRadius: '6px 6px 0 0',
                      },
                      '& .MuiChartsAxis-root': {
                        fontSize: isMobile ? '10px' : '12px',
                      },
                    }}
                  />
                ) : (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 500,
                  }}>
                    Pagaidām nav datu...
                  </div>
                )}
              </div>
            </Card>

            {/* Statistics Area Chart */}
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                padding: isMobile ? '16px' : isTablet ? '18px 20px' : '20px 24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: isMobile ? '16px' : '20px',
                marginBottom: isMobile ? '20px' : '24px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '8px',
                  width: '100%'
                }}
                className="stats-header"
                >
                  <div style={{ width: '100%' }}>
                    <h3 style={{ 
                      fontSize: isMobile ? '16px' : isTablet ? '17px' : '18px', 
                      fontWeight: 600, 
                      color: '#212B36', 
                      margin: 0, 
                      marginBottom: '4px' 
                    }}>
                      Statistika
                    </h3>
                    <p style={{ 
                      fontSize: isMobile ? '13px' : '14px', 
                      color: '#637381', 
                      margin: 0 
                    }}>
                      Mērķis, ko esat noteicis katram mēnesim
                    </p>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'start', 
                    gap: '12px',
                    width: '100%',
                    justifyContent: 'flex-end'
                  }}
                  className="time-period-buttons"
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      background: '#f1f5f9', 
                      borderRadius: '8px', 
                      padding: '4px' 
                    }}>
                      <button
                        onClick={() => setTimePeriod('monthly')}
                        style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          borderRadius: '6px',
                          border: 'none',
                          background: timePeriod === 'monthly' ? '#ffffff' : 'transparent',
                          color: timePeriod === 'monthly' ? '#212B36' : '#637381',
                          boxShadow: timePeriod === 'monthly' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Mēneša
                      </button>
                      <button
                        onClick={() => setTimePeriod('quarterly')}
                        style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          borderRadius: '6px',
                          border: 'none',
                          background: timePeriod === 'quarterly' ? '#ffffff' : 'transparent',
                          color: timePeriod === 'quarterly' ? '#212B36' : '#637381',
                          boxShadow: timePeriod === 'quarterly' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Ceturkšņa
                      </button>
                      <button
                        onClick={() => setTimePeriod('annually')}
                        style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: 500,
                          borderRadius: '6px',
                          border: 'none',
                          background: timePeriod === 'annually' ? '#ffffff' : 'transparent',
                          color: timePeriod === 'annually' ? '#212B36' : '#637381',
                          boxShadow: timePeriod === 'annually' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Gada
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ 
                height: isMobile ? '300px' : isTablet ? '320px' : '325px', 
                position: 'relative' 
              }}>
                {combinedStatisticsData.length > 0 ? (
                  <LineChart
                    width={undefined}
                    height={isMobile ? 300 : isTablet ? 320 : 325}
                    series={[
                      {
                        data: combinedStatisticsData.map(d => d.sales),
                        label: 'Pārdošana',
                        area: true,
                        curve: 'monotone',
                      },
                      {
                        data: combinedStatisticsData.map(d => d.revenue),
                        label: 'Ienākumi',
                        area: true,
                        curve: 'monotone',
                      },
                ]}
                xAxis={[{
                  scaleType: 'point',
                  data: combinedStatisticsData.map(d => d.month),
                }]}
                colors={['#0068FF', '#83AEEA']}
                sx={{
                  '& .MuiChartsAxis-root': {
                    fontSize: isMobile ? '10px' : '12px',
                  },
                }}
                  />
                ) : (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 500,
                  }}>
                    Pagaidām nav datu...
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Orders Table */}
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                padding: isMobile ? '16px' : '16px 20px 12px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                marginBottom: '16px'
              }}
              className="orders-header"
              >
                <div style={{ width: '100%' }}>
                  <h3 style={{ 
                    fontSize: isMobile ? '16px' : isTablet ? '17px' : '18px', 
                    fontWeight: 600, 
                    color: '#212B36', 
                    margin: 0 
                  }}>
                    Pēdējie pasūtījumi
                  </h3>
                </div>

              </div>
              <Table
                columns={orderColumns}
                dataSource={chartData.recentOrders}
                pagination={false}
              />
            </Card>
          </div>

          {/* Right Column */}
          <div style={{ 
            gridColumn: 'span 12',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
          className="right-column"
          >
            {/* Monthly Target Card */}
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                overflow: 'hidden',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
            >

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '8px',
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                  gap: isMobile ? '8px' : '0',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ 
                      fontSize: isMobile ? '16px' : isTablet ? '17px' : '18px', 
                      fontWeight: 600, 
                      color: '#212B36', 
                      margin: 0, 
                      marginBottom: '4px' 
                    }}>
                      Mēneša mērķis
                    </h3>
                    <p style={{ 
                      fontSize: isMobile ? '13px' : '14px', 
                      color: '#637381', 
                      margin: 0 
                    }}>
                      Mērķis, ko esat noteicis katram mēnesim
                    </p>
                  </div>
                  
                </div>
                <div style={{ position: 'relative', marginTop: isMobile ? '20px' : '24px' }}>
                  <div style={{ 
                    height: isMobile ? '140px' : isTablet ? '150px' : '158px', 
                    position: 'relative', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <PieChart
                      series={[
                        {
                          data: radialData,
                          innerRadius: isMobile ? 50 : isTablet ? 55 : 60,
                          outerRadius: isMobile ? 70 : isTablet ? 75 : 80,
                          paddingAngle: 0,
                        },
                      ]}
                      width={isMobile ? Math.min(180, windowWidth - 80) : isTablet ? 190 : 200}
                      height={isMobile ? 140 : isTablet ? 150 : 158}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ 
                        fontSize: isMobile ? '28px' : isTablet ? '32px' : '36px', 
                        fontWeight: 600, 
                        color: '#212B36', 
                        lineHeight: '1' 
                      }}>
                        {chartData.monthlyTargetProgress.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  {chartData.monthlyIncome > chartData.monthlyTarget && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '100%',
                        transform: 'translateX(-50%) translateY(-95%)',
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      +{((chartData.monthlyIncome / chartData.monthlyTarget) * 100 - 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p style={{ 
                  marginTop: isMobile ? '24px' : '40px', 
                  textAlign: 'center', 
                  fontSize: isMobile ? '12px' : '14px', 
                  color: '#637381', 
                  maxWidth: '380px', 
                  margin: isMobile ? '24px auto 0' : '40px auto 0',
                  padding: isMobile ? '0 8px' : '0',
                }}>
                  Jūs nopelnījāt €{chartData.monthlyIncome.toFixed(2)} šodien, tas ir augstāk nekā pagājušajā mēnesī. Turpiniet labo darbu!
                </p>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: isMobile ? '16px' : '20px', 
                  marginTop: '24px', 
                  paddingTop: '16px', 
                  borderTop: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <p style={{ 
                      margin: 0, 
                      marginBottom: '4px', 
                      textAlign: 'center', 
                      fontSize: isMobile ? '11px' : '12px', 
                      color: '#637381' 
                    }}>
                      Mērķis
                    </p>
                    <p style={{ 
                      margin: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '4px', 
                      fontSize: isMobile ? '16px' : '18px', 
                      fontWeight: 600, 
                      color: '#212B36' 
                    }}>
                      €{chartData.monthlyTarget.toLocaleString()}
                    </p>
                  </div>
                  <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }}></div>
                  <div>
                    <p style={{ 
                      margin: 0, 
                      marginBottom: '4px', 
                      textAlign: 'center', 
                      fontSize: isMobile ? '11px' : '12px', 
                      color: '#637381' 
                    }}>
                      Ienākumi
                    </p>
                    <p style={{ 
                      margin: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '4px', 
                      fontSize: isMobile ? '16px' : '18px', 
                      fontWeight: 600, 
                      color: '#212B36' 
                    }}>
                      €{chartData.monthlyIncome.toFixed(0).toLocaleString()}
                    </p>
                  </div>
                </div>
              
            </Card>
          </div>
        </div>

        {/* Responsive Styles */}
        <style>{`
          @media (min-width: 1280px) {
            .left-column {
              grid-column: span 7 !important;
            }
            .right-column {
              grid-column: span 5 !important;
            }
          }
          @media (min-width: 1024px) {
            .stats-header {
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: center !important;
            }
            .orders-header {
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: center !important;
            }
          }
          @media (max-width: 1023px) {
            .time-period-buttons {
              justify-content: flex-start !important;
              margin-top: 8px;
            }
            .orders-actions {
              justify-content: flex-start !important;
              margin-top: 8px;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
};

export default SalesCharts;
