import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Row, Col, Table, Typography, Select, Spin, DatePicker, Statistic, Empty, Tooltip, Alert } from 'antd';
import { InfoCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  LineController,
  DoughnutController,
  BarController,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import DashboardLayout from '../components/DashboardLayout';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  LineController,
  DoughnutController,
  BarController,
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler
);

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const SalesCharts = () => {
  const { userProfile, isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // Set document title
  useEffect(() => {
    document.title = 'Pārdošanas grafiki | Piffdeals';
  }, []);
  
  // Chart refs
  const revenueChartRef = useRef(null);
  const topProductsChartRef = useRef(null);
  const employeeChartRef = useRef(null);
  const statusChartRef = useRef(null);
  const paymentMethodChartRef = useRef(null);
  
  // Chart instances
  const [revenueChartInstance, setRevenueChartInstance] = useState(null);
  const [topProductsChartInstance, setTopProductsChartInstance] = useState(null);
  const [employeeChartInstance, setEmployeeChartInstance] = useState(null);
  const [statusChartInstance, setStatusChartInstance] = useState(null);
  const [paymentMethodChartInstance, setPaymentMethodChartInstance] = useState(null);
  
  // Filters
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('paid');
  const [timeRange, setTimeRange] = useState('30days'); // '7days', '30days', '90days', 'year', 'all'
  
  // Data state
  const [chartData, setChartData] = useState({
    revenueData: [],
    topProducts: [],
    employeePerformance: [],
    invoiceStatusData: {},
    paymentMethodData: {},
    kpi: {
      totalRevenue: 0,
      avgOrderValue: 0,
      totalInvoices: 0,
      paymentRate: 0,
    },
    topCustomers: [],
  });
  
  const [employees, setEmployees] = useState([]);

  // Check localStorage for disclaimer visibility
  useEffect(() => {
    const disclaimerClosed = localStorage.getItem('salesChartsDisclaimerClosed');
    if (disclaimerClosed === 'true') {
      setShowDisclaimer(false);
    }
  }, []);

  // Handle disclaimer close
  const handleDisclaimerClose = () => {
    setShowDisclaimer(false);
    localStorage.setItem('salesChartsDisclaimerClosed', 'true');
  };

  // Fetch employees list (for admin filter)
  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) return;
    
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, username, email')
          .order('username', { ascending: true });
        
        if (!error && data) {
          setEmployees(data);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    
    fetchEmployees();
  }, [isAdmin, isSuperAdmin]);

  // Calculate date range based on timeRange selection
  const getDateRange = (range) => {
    const end = dayjs();
    let start;
    const selectedRange = range || timeRange;
    
    switch (selectedRange) {
      case '7days':
        start = end.subtract(7, 'days');
        break;
      case '30days':
        start = end.subtract(30, 'days');
        break;
      case '90days':
        start = end.subtract(90, 'days');
        break;
      case 'year':
        start = end.subtract(1, 'year');
        break;
      case 'all':
        start = dayjs('2020-01-01'); // Start from a very early date
        break;
      default:
        start = end.subtract(30, 'days');
    }
    
    return [start, end];
  };

  // Fetch all chart data
  useEffect(() => {
    if (roleLoading || !userProfile) return;

    const fetchChartData = async () => {
      try {
        setLoading(true);
        const userId = userProfile.id;
        const isAdminUser = isAdmin || isSuperAdmin;
        
        // Get date range
        const [startDate, endDate] = dateRange || getDateRange(timeRange);
        const start = startDate.startOf('day').toISOString();
        const end = endDate.endOf('day').toISOString();

        // Build invoice query
        let invoiceQuery = supabase
          .from('invoices')
          .select('*');

        // Filter by user if not admin
        if (!isAdminUser) {
          invoiceQuery = invoiceQuery.eq('user_id', userId);
        } else if (selectedEmployee !== 'all') {
          invoiceQuery = invoiceQuery.eq('user_id', selectedEmployee);
        }

        // Filter by date range (using paid_date for paid invoices, created_at for others)
        if (selectedStatus === 'paid') {
          invoiceQuery = invoiceQuery
            .eq('status', 'paid')
            .gte('paid_date', startDate.format('YYYY-MM-DD'))
            .lte('paid_date', endDate.format('YYYY-MM-DD'));
        } else if (selectedStatus === 'all') {
          invoiceQuery = invoiceQuery
            .gte('created_at', start)
            .lte('created_at', end);
        } else {
          invoiceQuery = invoiceQuery
            .eq('status', selectedStatus)
            .gte('created_at', start)
            .lte('created_at', end);
        }

        const { data: invoices, error: invoicesError } = await invoiceQuery;

        if (invoicesError) throw invoicesError;

        // Filter for paid invoices for revenue calculations
        const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];

        // 1. Revenue over time
        const revenueData = [];
        const daysDiff = endDate.diff(startDate, 'day');
        const groupBy = daysDiff <= 7 ? 'day' : daysDiff <= 90 ? 'day' : 'month';
        
        if (groupBy === 'day') {
          for (let i = 0; i <= daysDiff; i++) {
            const date = startDate.add(i, 'day');
            const dayPaid = paidInvoices.filter(inv => {
              const paidDate = dayjs(inv.paid_date || inv.updated_at);
              return paidDate.isSame(date, 'day');
            });
            const revenue = dayPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
            revenueData.push({
              date: date.format('DD.MM'),
              revenue,
              count: dayPaid.length,
            });
          }
        } else {
          // Group by month
          let current = startDate.startOf('month');
          while (current.isBefore(endDate) || current.isSame(endDate, 'month')) {
            const monthPaid = paidInvoices.filter(inv => {
              const paidDate = dayjs(inv.paid_date || inv.updated_at);
              return paidDate.isSame(current, 'month');
            });
            const revenue = monthPaid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
            revenueData.push({
              date: current.format('MMM YYYY'),
              revenue,
              count: monthPaid.length,
            });
            current = current.add(1, 'month');
          }
        }

        // 2. Top Products (only for paid invoices)
        const { data: invoiceItems, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .in('invoice_id', paidInvoices.map(inv => inv.id));

        if (!itemsError && invoiceItems) {
          const productMap = {};
          invoiceItems.forEach(item => {
            const key = item.product_name || item.product_id || 'Unknown';
            if (!productMap[key]) {
              productMap[key] = {
                name: key,
                revenue: 0,
                quantity: 0,
                count: 0,
              };
            }
            productMap[key].revenue += parseFloat(item.total || 0);
            productMap[key].quantity += parseInt(item.quantity || 0);
            productMap[key].count += 1;
          });

          const topProducts = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
          
          setChartData(prev => ({ ...prev, topProducts }));
        }

        // 3. Employee Performance (admin only)
        let employeePerformance = [];
        if (isAdminUser) {
          const employeeMap = {};
          paidInvoices.forEach(inv => {
            if (!employeeMap[inv.user_id]) {
              employeeMap[inv.user_id] = {
                userId: inv.user_id,
                revenue: 0,
                count: 0,
              };
            }
            employeeMap[inv.user_id].revenue += parseFloat(inv.total || 0);
            employeeMap[inv.user_id].count += 1;
          });

          // Fetch user names
          const userIds = Object.keys(employeeMap);
          if (userIds.length > 0) {
            const { data: users } = await supabase
              .from('user_profiles')
              .select('id, username, email')
              .in('id', userIds);

            if (users) {
              employeePerformance = userIds.map(userId => {
                const user = users.find(u => u.id === userId);
                return {
                  ...employeeMap[userId],
                  name: user?.username || user?.email || 'Unknown',
                };
              }).sort((a, b) => b.revenue - a.revenue);
            }
          }
        }

        // 4. Invoice Status Distribution
        const statusCounts = {
          paid: 0,
          sent: 0,
          pending: 0,
          overdue: 0,
          draft: 0,
          cancelled: 0,
        };
        invoices?.forEach(inv => {
          if (statusCounts.hasOwnProperty(inv.status)) {
            statusCounts[inv.status]++;
          }
        });

        // 5. Payment Method Distribution (only for paid invoices)
        const paymentMethodCounts = {};
        paidInvoices.forEach(inv => {
          const method = inv.payment_method || 'unknown';
          if (!paymentMethodCounts[method]) {
            paymentMethodCounts[method] = { count: 0, revenue: 0 };
          }
          paymentMethodCounts[method].count++;
          paymentMethodCounts[method].revenue += parseFloat(inv.total || 0);
        });

        // 6. Top Customers
        const customerMap = {};
        paidInvoices.forEach(inv => {
          const key = inv.customer_name || 'Unknown';
          if (!customerMap[key]) {
            customerMap[key] = {
              name: key,
              email: inv.customer_email,
              revenue: 0,
              count: 0,
            };
          }
          customerMap[key].revenue += parseFloat(inv.total || 0);
          customerMap[key].count += 1;
        });

        const topCustomers = Object.values(customerMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // 7. KPI Calculations
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
        const avgOrderValue = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;
        const totalInvoices = invoices?.length || 0;
        const paymentRate = totalInvoices > 0 ? (paidInvoices.length / totalInvoices) * 100 : 0;

        setChartData({
          revenueData,
          topProducts: chartData.topProducts, // Keep existing if no new data
          employeePerformance,
          invoiceStatusData: statusCounts,
          paymentMethodData: paymentMethodCounts,
          kpi: {
            totalRevenue,
            avgOrderValue,
            totalInvoices,
            paymentRate,
          },
          topCustomers,
        });
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [userProfile, isAdmin, isSuperAdmin, roleLoading, dateRange, selectedEmployee, selectedStatus, timeRange]);

  // Update date range when timeRange changes
  useEffect(() => {
    if (timeRange !== 'custom') {
      const [start, end] = getDateRange(timeRange);
      setDateRange([start, end]);
    }
  }, [timeRange]);

  // Revenue Chart
  useEffect(() => {
    if (!revenueChartRef.current || !chartData.revenueData.length) return;

    if (revenueChartInstance) {
      revenueChartInstance.destroy();
    }

    const ctx = revenueChartRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.revenueData.map(d => d.date),
        datasets: [
          {
            label: 'Ienākumi (€)',
            data: chartData.revenueData.map(d => d.revenue),
            borderColor: '#137fec',
            backgroundColor: 'rgba(19, 127, 236, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#137fec',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: function(context) {
                return `Ienākumi: €${context.parsed.y.toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '€' + value.toFixed(0);
              },
            },
          },
        },
      },
    });

    setRevenueChartInstance(chart);
    return () => chart.destroy();
  }, [chartData.revenueData]);

  // Top Products Chart
  useEffect(() => {
    if (!topProductsChartRef.current || !chartData.topProducts.length) return;

    if (topProductsChartInstance) {
      topProductsChartInstance.destroy();
    }

    const ctx = topProductsChartRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.topProducts.map(p => p.name.length > 30 ? p.name.substring(0, 30) + '...' : p.name),
        datasets: [
          {
            label: 'Ienākumi (€)',
            data: chartData.topProducts.map(p => p.revenue),
            backgroundColor: '#137fec',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 12,
            callbacks: {
              label: function(context) {
                const product = chartData.topProducts[context.dataIndex];
                return [
                  `Ienākumi: €${context.parsed.x.toFixed(2)}`,
                  `Daudzums: ${product.quantity}`,
                  `Rēķini: ${product.count}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '€' + value.toFixed(0);
              },
            },
          },
        },
      },
    });

    setTopProductsChartInstance(chart);
    return () => chart.destroy();
  }, [chartData.topProducts]);

  // Employee Performance Chart
  useEffect(() => {
    if (!employeeChartRef.current || !chartData.employeePerformance.length || (!isAdmin && !isSuperAdmin)) return;

    if (employeeChartInstance) {
      employeeChartInstance.destroy();
    }

    const ctx = employeeChartRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.employeePerformance.map(e => e.name),
        datasets: [
          {
            label: 'Ienākumi (€)',
            data: chartData.employeePerformance.map(e => e.revenue),
            backgroundColor: '#22c55e',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 12,
            callbacks: {
              label: function(context) {
                const emp = chartData.employeePerformance[context.dataIndex];
                return [
                  `Ienākumi: €${context.parsed.y.toFixed(2)}`,
                  `Rēķini: ${emp.count}`,
                ];
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '€' + value.toFixed(0);
              },
            },
          },
        },
      },
    });

    setEmployeeChartInstance(chart);
    return () => chart.destroy();
  }, [chartData.employeePerformance, isAdmin, isSuperAdmin]);

  // Invoice Status Chart
  useEffect(() => {
    if (!statusChartRef.current || Object.values(chartData.invoiceStatusData).every(v => v === 0)) return;

    if (statusChartInstance) {
      statusChartInstance.destroy();
    }

    const ctx = statusChartRef.current.getContext('2d');
    const statusLabels = {
      paid: 'Apmaksāts',
      sent: 'Nosūtīts',
      pending: 'Gaida',
      overdue: 'Nokavēts',
      draft: 'Melnraksts',
      cancelled: 'Atcelts',
    };
    const statusColors = {
      paid: '#22c55e',
      sent: '#3b82f6',
      pending: '#f59e0b',
      overdue: '#ef4444',
      draft: '#9ca3af',
      cancelled: '#6b7280',
    };

    const labels = [];
    const data = [];
    const backgroundColor = [];

    Object.entries(chartData.invoiceStatusData).forEach(([status, count]) => {
      if (count > 0) {
        labels.push(statusLabels[status] || status);
        data.push(count);
        backgroundColor.push(statusColors[status] || '#9ca3af');
      }
    });

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 },
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 12,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    setStatusChartInstance(chart);
    return () => chart.destroy();
  }, [chartData.invoiceStatusData]);

  // Payment Method Chart
  useEffect(() => {
    if (!paymentMethodChartRef.current || Object.keys(chartData.paymentMethodData).length === 0) return;

    if (paymentMethodChartInstance) {
      paymentMethodChartInstance.destroy();
    }

    const ctx = paymentMethodChartRef.current.getContext('2d');
    const methodLabels = {
      stripe: 'Stripe',
      bank_transfer: 'Bankas pārskaitījums',
      cash: 'Skaidra nauda',
      unknown: 'Nav norādīts',
    };

    const labels = [];
    const data = [];
    const backgroundColor = ['#137fec', '#22c55e', '#f59e0b', '#9ca3af'];

    Object.entries(chartData.paymentMethodData).forEach(([method, value], index) => {
      labels.push(methodLabels[method] || method);
      data.push(value.revenue);
      backgroundColor.push(['#137fec', '#22c55e', '#f59e0b', '#9ca3af'][index % 4]);
    });

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 },
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 12,
            callbacks: {
              label: function(context) {
                const method = Object.keys(chartData.paymentMethodData)[context.dataIndex];
                const value = chartData.paymentMethodData[method];
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return [
                  `${context.label}: €${context.parsed.x.toFixed(2)}`,
                  `Rēķini: ${value.count}`,
                  `Procents: ${percentage}%`,
                ];
              },
            },
          },
        },
      },
    });

    setPaymentMethodChartInstance(chart);
    return () => chart.destroy();
  }, [chartData.paymentMethodData]);

  // Top Customers Table Columns
  const customerColumns = [
    {
      title: 'Klients',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text style={{ fontWeight: 500, color: '#111827' }}>{text}</Text>,
    },
    {
      title: 'E-pasts',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <Text style={{ color: '#6b7280' }}>{text || '-'}</Text>,
    },
    {
      title: 'Rēķini',
      dataIndex: 'count',
      key: 'count',
      align: 'right',
      render: (count) => <Text style={{ color: '#6b7280' }}>{count}</Text>,
    },
    {
      title: 'Ienākumi',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      sorter: (a, b) => a.revenue - b.revenue,
      render: (revenue) => (
        <Text style={{ fontWeight: 600, color: '#111827' }}>€{revenue.toFixed(2)}</Text>
      ),
    },
  ];

  if (roleLoading || loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Page Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Title level={1} style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: '1.2' }}>
              Pārdošanas grafiki
            </Title>
            <Tooltip 
              title={
                <div style={{ maxWidth: '300px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>Pārdošanas analīze</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                    Šeit varat skatīt detalizētu pārdošanas analīzi ar grafikiem un statistiku. Varat filtrēt pēc laika perioda, darbinieka (tikai administratoriem) un rēķina statusa. Ienākumi tiek aprēķināti tikai no apmaksātiem rēķiniem. Administratori redz visu sistēmas datu, bet darbinieki redz tikai savus rēķinus.
                  </div>
                </div>
              }
              placement="right"
            >
              <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
            </Tooltip>
          </div>
          <Text style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
            Detalizēta pārdošanas analīze un statistika
          </Text>
        </div>

        {/* Disclaimer */}
        {showDisclaimer && (
          <Alert
            message="Svarīga informācija par pārdošanas datiem"
            description="Visi pārdošanas grafiki un statistika tiek ģenerēti tikai no rēķiniem, kas izveidoti šajā sistēmā. Šie dati NAV saistīti ar faktisko Mozello ecommerce veikalu un neatspoguļo visus veikala pārdošanas datus."
            type="info"
            icon={<ExclamationCircleOutlined />}
            showIcon
            closable
            onClose={handleDisclaimerClose}
            style={{
              borderRadius: '12px',
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
            }}
          />
        )}

        {/* Filters */}
        <Card
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          }}
          styles={{ body: { padding: '24px' } }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: '8px' }}>
                <Text style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Laika periods</Text>
              </div>
              <Select
                value={timeRange}
                onChange={(value) => {
                  setTimeRange(value);
                  if (value !== 'custom') {
                    const end = dayjs();
                    let start;
                    switch (value) {
                      case '7days':
                        start = end.subtract(7, 'days');
                        break;
                      case '30days':
                        start = end.subtract(30, 'days');
                        break;
                      case '90days':
                        start = end.subtract(90, 'days');
                        break;
                      case 'year':
                        start = end.subtract(1, 'year');
                        break;
                      case 'all':
                        start = dayjs('2020-01-01');
                        break;
                      default:
                        start = end.subtract(30, 'days');
                    }
                    setDateRange([start, end]);
                  }
                }}
                style={{ width: '100%' }}
                size="large"
              >
                <Option value="7days">Pēdējās 7 dienas</Option>
                <Option value="30days">Pēdējās 30 dienas</Option>
                <Option value="90days">Pēdējās 90 dienas</Option>
                <Option value="year">Pēdējais gads</Option>
                <Option value="all">Viss laiks</Option>
                <Option value="custom">Pielāgotais diapazons</Option>
              </Select>
            </Col>
            {timeRange === 'custom' && (
              <Col xs={24} sm={12} md={6}>
                <div style={{ marginBottom: '8px' }}>
                  <Text style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Datuma diapazons</Text>
                </div>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ width: '100%' }}
                  size="large"
                  format="DD.MM.YYYY"
                />
              </Col>
            )}
            {(isAdmin || isSuperAdmin) && (
              <Col xs={24} sm={12} md={6}>
                <div style={{ marginBottom: '8px' }}>
                  <Text style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Darbinieks</Text>
                </div>
                <Select
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  style={{ width: '100%' }}
                  size="large"
                >
                  <Option value="all">Visi darbinieki</Option>
                  {employees.map(emp => (
                    <Option key={emp.id} value={emp.id}>
                      {emp.username || emp.email}
                    </Option>
                  ))}
                </Select>
              </Col>
            )}
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: '8px' }}>
                <Text style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Statuss</Text>
              </div>
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                style={{ width: '100%' }}
                size="large"
              >
                <Option value="paid">Apmaksāts</Option>
                <Option value="all">Visi</Option>
                <Option value="sent">Nosūtīts</Option>
                <Option value="pending">Gaida</Option>
                <Option value="overdue">Nokavēts</Option>
              </Select>
            </Col>
          </Row>
        </Card>

        {/* KPI Cards */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px' } }}
            >
              <Statistic
                title="Kopējie ienākumi"
                value={chartData.kpi.totalRevenue}
                precision={2}
                prefix="€"
                valueStyle={{ color: '#137fec', fontSize: '28px', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px' } }}
            >
              <Statistic
                title="Vidējā pasūtījuma vērtība"
                value={chartData.kpi.avgOrderValue}
                precision={2}
                prefix="€"
                valueStyle={{ color: '#22c55e', fontSize: '28px', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px' } }}
            >
              <Statistic
                title="Rēķinu skaits"
                value={chartData.kpi.totalInvoices}
                valueStyle={{ color: '#111827', fontSize: '28px', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px' } }}
            >
              <Statistic
                title="Apmaksas procents"
                value={chartData.kpi.paymentRate}
                precision={1}
                suffix="%"
                valueStyle={{ color: '#f59e0b', fontSize: '28px', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Revenue Chart */}
        <Card
          title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Ienākumi laika gaitā</span>}
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          }}
          styles={{ body: { padding: '24px' } }}
        >
          <div style={{ height: '400px', position: 'relative' }}>
            {chartData.revenueData.length > 0 ? (
              <canvas ref={revenueChartRef} />
            ) : (
              <Empty description="Nav datu" style={{ marginTop: '100px' }} />
            )}
          </div>
        </Card>

        {/* Charts Row */}
        <Row gutter={[24, 24]}>
          {/* Top Products */}
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Top produkti</span>}
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px' } }}
            >
              <div style={{ height: '400px', position: 'relative' }}>
                {chartData.topProducts.length > 0 ? (
                  <canvas ref={topProductsChartRef} />
                ) : (
                  <Empty description="Nav datu" style={{ marginTop: '100px' }} />
                )}
              </div>
            </Card>
          </Col>

          {/* Invoice Status */}
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Rēķinu statuss</span>}
              variant="outlined"
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}
              styles={{ body: { padding: '24px' } }}
            >
              <div style={{ height: '400px', position: 'relative' }}>
                {Object.values(chartData.invoiceStatusData).some(v => v > 0) ? (
                  <canvas ref={statusChartRef} />
                ) : (
                  <Empty description="Nav datu" style={{ marginTop: '100px' }} />
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Employee Performance & Payment Methods */}
        {(isAdmin || isSuperAdmin) && (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Darbinieku veiktspēja</span>}
                variant="outlined"
                style={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                }}
                styles={{ body: { padding: '24px' } }}
              >
                <div style={{ height: '400px', position: 'relative' }}>
                  {chartData.employeePerformance.length > 0 ? (
                    <canvas ref={employeeChartRef} />
                  ) : (
                    <Empty description="Nav datu" style={{ marginTop: '100px' }} />
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Maksājumu veidi</span>}
                variant="outlined"
                style={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                }}
                styles={{ body: { padding: '24px' } }}
              >
                <div style={{ height: '400px', position: 'relative' }}>
                  {Object.keys(chartData.paymentMethodData).length > 0 ? (
                    <canvas ref={paymentMethodChartRef} />
                  ) : (
                    <Empty description="Nav datu" style={{ marginTop: '100px' }} />
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Top Customers Table */}
        <Card
          title={<span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Top klienti</span>}
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            columns={customerColumns}
            dataSource={chartData.topCustomers.map((c, i) => ({ ...c, key: i }))}
            pagination={false}
            locale={{
              emptyText: 'Nav datu',
            }}
            className="custom-table"
          />
        </Card>
      </div>

      {/* Custom Table Styles */}
      <style>{`
        .custom-table .ant-table {
          font-size: 14px;
        }

        .custom-table .ant-table-thead > tr > th {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 24px;
        }

        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e5e7eb;
          padding: 16px 24px;
        }

        .custom-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        .custom-table .ant-table-tbody > tr {
          background: #ffffff;
        }

        .custom-table .ant-table-tbody > tr:hover > td {
          background: #f9fafb;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default SalesCharts;

