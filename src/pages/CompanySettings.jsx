import { useState, useEffect } from 'react';
import { Card, Typography, Switch, InputNumber, Space, Spin, Empty, Alert, Tooltip, Divider, App } from 'antd';
import { SettingOutlined, InfoCircleOutlined, PercentageOutlined, SaveOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useUserRole } from '../hooks/useUserRole';
import { logActivity, ActionTypes, ActionCategories } from '../services/activityLogService';

const { Title, Text, Paragraph } = Typography;

const CompanySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState(21); // Default 21% (Latvia standard VAT rate)
  // Track original values to compare what changed
  const [originalVatEnabled, setOriginalVatEnabled] = useState(false);
  const [originalVatRate, setOriginalVatRate] = useState(21);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { isSuperAdmin, userProfile } = useUserRole();
  const { message } = App.useApp();

  // Set document title
  useEffect(() => {
    document.title = 'Uzņēmuma iestatījumi | Piffdeals';
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSettings();
    }
  }, [isSuperAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the database function to get VAT setting
      const { data, error } = await supabase.rpc('get_vat_setting');

      if (error) {
        throw error;
      }

      if (data) {
        const enabled = data.enabled || false;
        const rate = (data.rate || 0.21) * 100; // Convert decimal to percentage
        setVatEnabled(enabled);
        setVatRate(rate);
        // Store original values for comparison when saving
        setOriginalVatEnabled(enabled);
        setOriginalVatRate(rate);
      }
    } catch (error) {
      setError(`Kļūda ielādējot iestatījumus: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVatToggle = (checked) => {
    setVatEnabled(checked);
    setHasChanges(true);
  };

  const handleVatRateChange = (value) => {
    if (value !== null && value >= 0 && value <= 100) {
      setVatRate(value);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Call the database function to update VAT setting
      const { data, error } = await supabase.rpc('update_vat_setting', {
        p_enabled: vatEnabled,
        p_rate: vatRate / 100, // Convert percentage to decimal
      });

      if (error) {
        throw error;
      }

      // Determine what changed and build description
      const enabledChanged = vatEnabled !== originalVatEnabled;
      const rateChanged = vatRate !== originalVatRate;
      
      let description = '';
      if (enabledChanged && rateChanged) {
        description = `Mainīti PVN iestatījumi: ${originalVatEnabled ? 'ieslēgts' : 'izslēgts'} → ${vatEnabled ? 'ieslēgts' : 'izslēgts'}, likme ${originalVatRate}% → ${vatRate}%`;
      } else if (enabledChanged) {
        description = `${vatEnabled ? 'Ieslēgts' : 'Izslēgts'} PVN aprēķins (${vatRate}%)`;
      } else if (rateChanged) {
        description = `Mainīta PVN likme no ${originalVatRate}% uz ${vatRate}%`;
      } else {
        description = `Saglabāti PVN iestatījumi (${vatEnabled ? 'ieslēgts' : 'izslēgts'}, ${vatRate}%)`;
      }
      
      // Log the activity with full details
      await logActivity({
        actionType: ActionTypes.SYSTEM_CONFIG_CHANGED,
        actionCategory: ActionCategories.SYSTEM,
        description: description,
        details: {
          setting_type: 'vat',
          vat_enabled: vatEnabled,
          vat_rate: vatRate,
          old_vat_enabled: originalVatEnabled,
          old_vat_rate: originalVatRate,
          enabled_changed: enabledChanged,
          rate_changed: rateChanged,
          modified_by: userProfile?.username || 'Nezināms',
        },
        targetType: 'system',
        targetId: null, // System settings don't have a UUID, use null instead
      });

      message.success('Iestatījumi saglabāti!');
      setHasChanges(false);
      // Update original values to new saved values
      setOriginalVatEnabled(vatEnabled);
      setOriginalVatRate(vatRate);
    } catch (error) {
      setError(`Kļūda saglabājot iestatījumus: ${error.message}`);
      message.error('Neizdevās saglabāt iestatījumus');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <Card>
          <Empty description="Nav piekļuves. Šo lapu var skatīt tikai galvenais administrators." />
        </Card>
      </DashboardLayout>
    );
  }

  if (loading) {
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
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Title level={2} style={{ margin: 0 }}>
            Uzņēmuma iestatījumi
          </Title>
          <Tooltip 
            title={
              <div style={{ maxWidth: '300px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>Uzņēmuma iestatījumi</div>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  Šeit varat konfigurēt uzņēmuma līmeņa iestatījumus, kas ietekmē visu sistēmu. 
                  Pieejams tikai galvenajam administratoram.
                </div>
              </div>
            }
            placement="right"
          >
            <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
          </Tooltip>
        </div>
        <Text type="secondary">
          Konfigurējiet uzņēmuma līmeņa iestatījumus
        </Text>
      </div>

      {error && (
        <Alert
          message="Kļūda"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* VAT Settings Card */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PercentageOutlined style={{ fontSize: '20px', color: '#0068FF' }} />
            <span>PVN (Pievienotās vērtības nodoklis)</span>
          </div>
        }
        style={{ marginBottom: '24px' }}
      >
        <Paragraph style={{ marginBottom: '24px', color: '#6b7280' }}>
          Ieslēdziet PVN aprēķinu, lai automātiski pievienotu nodokli visiem rēķiniem. 
          PVN tiks aprēķināts un iekļauts Stripe maksājumu linkos.
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* VAT Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px', color: '#111827' }}>
                PVN aprēķins
              </div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {vatEnabled 
                  ? 'PVN tiek aprēķināts un pievienots visiem rēķiniem' 
                  : 'PVN netiek aprēķināts rēķinos'}
              </Text>
            </div>
            <Switch
              checked={vatEnabled}
              onChange={handleVatToggle}
              size="default"
              style={{
                background: vatEnabled ? '#0068FF' : undefined,
              }}
            />
          </div>

          {/* VAT Rate Input */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px',
            background: vatEnabled ? '#f0f7ff' : '#f9fafb',
            borderRadius: '8px',
            border: `1px solid ${vatEnabled ? '#0068FF' : '#e5e7eb'}`,
            opacity: vatEnabled ? 1 : 0.6,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px', color: '#111827' }}>
                PVN likme
              </div>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                Latvijas standarta PVN likme ir 21%
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <InputNumber
                value={vatRate}
                onChange={handleVatRateChange}
                min={0}
                max={100}
                precision={2}
                disabled={!vatEnabled}
                style={{
                  width: '120px',
                  fontWeight: 600,
                }}
                addonAfter="%"
              />
            </div>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* Information Box */}
          <Alert
            message="Kā tas darbojas?"
            description={
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>Ieslēgts:</strong> PVN tiek automātiski aprēķināts un pievienots visiem jaunajiem rēķiniem. 
                    Stripe maksājumu linkos tiks iekļauta summa ar PVN.
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>Izslēgts:</strong> Rēķini tiek izveidoti bez PVN aprēķina. 
                    Cenas paliek nemainīgas.
                  </li>
                  <li>
                    <strong>Esošie rēķini:</strong> Šis iestatījums neietekmē jau izveidotos rēķinus. 
                    Izmaiņas attiecas tikai uz jauniem rēķiniem.
                  </li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
          />

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              style={{
                padding: '10px 24px',
                background: hasChanges && !saving ? '#0068FF' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {saving ? (
                <>
                  <Spin size="small" />
                  Saglabā...
                </>
              ) : (
                <>
                  <SaveOutlined />
                  Saglabāt izmaiņas
                </>
              )}
            </button>
          </div>
        </Space>
      </Card>

      {/* Future Settings Placeholder */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SettingOutlined style={{ fontSize: '20px', color: '#6b7280' }} />
            <span>Citi iestatījumi</span>
          </div>
        }
        style={{ opacity: 0.6 }}
      >
        <Empty 
          description="Vairāk iestatījumu būs pieejami drīzumā"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    </DashboardLayout>
  );
};

export default CompanySettings;




