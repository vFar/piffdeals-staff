import { useState, useEffect } from 'react';
import { Card, Table, Typography, Breadcrumb, Tag, Space, message, Spin, Modal, Form, Input, Select, Button, Popconfirm, Dropdown, App, Tooltip } from 'antd';
import { PlusOutlined, MoreOutlined, SearchOutlined, UserSwitchOutlined, DeleteOutlined, EditOutlined, MailOutlined, InfoCircleOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useUserRole } from '../hooks/useUserRole';
import { sendPasswordResetEmail } from '../services/userService';
import { logUserAction, logSecurityAction, ActionTypes, ActionCategories } from '../services/activityLogService';

const { Title, Text } = Typography;
const { Option } = Select;

const UserAccounts = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load separately
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isBulkRoleModalOpen, setIsBulkRoleModalOpen] = useState(false);
  const [bulkRoleForm] = Form.useForm();
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm] = Form.useForm();
  const [passwordResetCooldown, setPasswordResetCooldown] = useState(0);
  const { isAdmin, isSuperAdmin, userProfile } = useUserRole();
  const { message: messageApi, modal } = App.useApp();

  useEffect(() => {
    if (isAdmin || isSuperAdmin) {
      fetchUsers();
    }
  }, [isAdmin, isSuperAdmin]);

  // Search filter effect
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lowerSearch = searchText.toLowerCase();
    const filtered = users.filter((user) => {
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (getRoleLabel(user.role).label || '').toLowerCase();
      
      return username.includes(lowerSearch) || 
             email.includes(lowerSearch) || 
             role.includes(lowerSearch);
    });

    setFilteredUsers(filtered);
  }, [searchText, users]);

  const fetchUsers = async () => {
    try {
      // Only show spinner on initial load, not on refreshes
      if (initialLoad) {
        setLoading(true);
      }
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      message.error('Kļūda ielādējot lietotājus');
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false); // Mark initial load as complete
      }
    }
  };

  // Create user function with role-based permissions and email validation
  const handleCreateUser = async (values) => {
    try {
      setSubmitting(true);

      // Role-based permission check
      if (isAdmin && !isSuperAdmin && values.role !== 'employee') {
        messageApi.error('Administrators var izveidot tikai darbinieku kontus');
        setSubmitting(false);
        return;
      }

      // Check email uniqueness
      const { data: existingUsers, error: checkError } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', values.email.toLowerCase())
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (existingUsers && existingUsers.length > 0) {
        messageApi.error('Lietotājs ar šo e-pastu jau eksistē');
        setSubmitting(false);
        return;
      }

      // Try to call Supabase Edge Function
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      
      let userId = null;
      
      try {
        // Get the current session to pass auth token
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            username: values.name,
            role: values.role,
            status: values.status,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          userId = result.userId;
        } else {
          let errorData = {};
          try {
            errorData = await response.json();
          } catch (parseError) {
            // If JSON parsing fails, try to get text
            const text = await response.text().catch(() => '');
            errorData = { error: text || 'Unknown error' };
          }
          
          console.log('Edge function error response:', {
            status: response.status,
            errorData,
            statusText: response.statusText
          });
          
          // Check if it's a duplicate email error
          if (response.status === 409 || 
              errorData.errorCode === 'DUPLICATE_EMAIL' || 
              errorData.error?.includes('already exists') || 
              errorData.error?.includes('already registered') ||
              errorData.error?.includes('duplicate') ||
              errorData.error?.toLowerCase().includes('email')) {
            throw new Error('Lietotājs ar šo e-pastu jau eksistē');
          }
          
          throw new Error(errorData.error || errorData.message || 'Edge function returned an error');
        }
      } catch (edgeError) {
        // Check if it's already a duplicate email error message
        if (edgeError.message === 'Lietotājs ar šo e-pastu jau eksistē') {
          throw edgeError;
        }
        
        // Check if the error message contains duplicate email indicators
        if (edgeError.message?.includes('already exists') || 
            edgeError.message?.includes('already registered') ||
            edgeError.message?.includes('duplicate')) {
          throw new Error('Lietotājs ar šo e-pastu jau eksistē');
        }
        
        throw new Error(
          'Kļūda sazināties ar serveri. Lūdzu, pārbaudiet savienojumu un mēģiniet vēlreiz.'
        );
      }

      // Edge Function creates both auth user AND profile, so we're done!
      // No need to create profile here - it's already created by the Edge Function

      // Log activity: user created
      if (userId) {
        try {
          const logResult = await logUserAction(
            ActionTypes.USER_CREATED,
            `Izveidots jauns lietotāja konts: ${values.name} ar lomu "${getRoleLabel(values.role).label}"`,
            {
              created_user_role: values.role,
              created_user_status: values.status,
              created_by: userProfile?.username || 'Nezināms',
              target_user_role: values.role,
              target_user_status: values.status,
            },
            userId
          );
          if (!logResult.success) {
            console.error('Failed to log user creation:', logResult.error);
          }
        } catch (logError) {
          console.error('Error logging user creation:', logError);
        }
      }

      messageApi.success('Lietotājs veiksmīgi izveidots');
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Show error message - check if it's a duplicate email error
      const errorMessage = error.message || String(error) || 'Kļūda izveidojot lietotāju';
      console.log('Error message to display:', errorMessage);
      
      // Determine the error message to show
      let displayMessage = errorMessage;
      if (errorMessage.includes('Lietotājs ar šo e-pastu jau eksistē') || 
          errorMessage.toLowerCase().includes('already exists') ||
          errorMessage.toLowerCase().includes('already registered') ||
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.toLowerCase().includes('email')) {
        displayMessage = 'Lietotājs ar šo e-pastu jau eksistē';
      }
      
      // Show error message using messageApi
      messageApi.error(displayMessage);
      
      // Don't close the modal on error - let user see the error and try again
      // Keep submitting state false so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk delete selected users
  const handleBulkDelete = async () => {
    try {
      setBulkActionLoading(true);

      // Prevent users from deleting themselves
      if (selectedRowKeys.includes(userProfile?.id)) {
        message.error('Jūs nevarat dzēst savu pašu kontu. Lūdzu izmantojiet Profilu.');
        setBulkActionLoading(false);
        return;
      }

      // Check permissions - admin can't delete admins or super_admins
      if (isAdmin && !isSuperAdmin) {
        const selectedUsers = users.filter((u) => selectedRowKeys.includes(u.id));
        const hasHigherRoleUsers = selectedUsers.some((u) => u.role === 'admin' || u.role === 'super_admin');
        
        if (hasHigherRoleUsers) {
          message.error('Administrators nevar dzēst citus administratorus');
          setBulkActionLoading(false);
          return;
        }
      }

      // Call the edge function to delete users from both auth and database
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      
      // Get the current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userIds: selectedRowKeys,
        }),
      });

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          const text = await response.text().catch(() => '');
          errorData = { error: text || 'Unknown error' };
        }
        
        throw new Error(errorData.error || errorData.message || 'Kļūda dzēšot lietotājus');
      }

      const result = await response.json();
      
      if (result.success) {
        // Log activity: bulk user deletion
        const deletedUserIds = result.deletedUserIds || selectedRowKeys;
        const deletedUsers = users.filter((u) => deletedUserIds.includes(u.id));
        
        for (const deletedUser of deletedUsers) {
          const isOwnAccount = deletedUser.id === userProfile?.id;
          try {
            const logResult = await logUserAction(
              ActionTypes.USER_DELETED,
              `Dzēsts lietotāja konts: ${deletedUser.username}${isOwnAccount ? ' (savs konts)' : ' (cita lietotāja konts)'}${deletedUserIds.length > 1 ? ` (masveida dzēšana)` : ''}`,
              {
                deleted_user_role: deletedUser.role,
                deleted_user_status: deletedUser.status,
                bulk_action: deletedUserIds.length > 1,
                total_deleted: deletedUserIds.length > 1 ? deletedUserIds.length : undefined,
                is_own_account: isOwnAccount,
                is_other_user_account: !isOwnAccount,
                deleted_by: userProfile?.username || 'Nezināms',
                target_user_role: deletedUser.role,
                target_user_status: deletedUser.status,
              },
              deletedUser.id
            );
            if (!logResult.success) {
              console.error('Failed to log user deletion:', logResult.error);
            }
          } catch (logError) {
            console.error('Error logging user deletion:', logError);
          }
        }

        if (result.errors && result.errors.length > 0) {
          // Partial success
          message.warning(`${result.deletedUserIds?.length || 0} lietotāji izdzēsti, ${result.errors.length} neizdevās`);
        } else {
          // Full success
          message.success(`${result.deletedUserIds?.length || selectedRowKeys.length} lietotāji veiksmīgi izdzēsti`);
        }
        setSelectedRowKeys([]);
        fetchUsers();
      } else {
        throw new Error(result.error || 'Kļūda dzēšot lietotājus');
      }
    } catch (error) {
      console.error('Error deleting users:', error);
      message.error(error.message || 'Kļūda dzēšot lietotājus');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk change role
  const handleBulkRoleChange = async (values) => {
    try {
      setBulkActionLoading(true);

      // Check permissions - admin can only set role to employee
      if (isAdmin && !isSuperAdmin && values.role !== 'employee') {
        message.error('Administrators var piešķirt tikai darbinieka lomu');
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: values.role })
        .in('id', selectedRowKeys);

      if (error) throw error;

      // Log activity: bulk role change
      const updatedUsers = users.filter((u) => selectedRowKeys.includes(u.id));
      for (const user of updatedUsers) {
        if (user.role !== values.role) {
          const isOwnAccount = user.id === userProfile?.id;
          try {
            const result = await logUserAction(
              ActionTypes.ROLE_CHANGED,
              `Mainīta lietotāja loma: ${user.username} no "${getRoleLabel(user.role).label}" uz "${getRoleLabel(values.role).label}"${isOwnAccount ? ' (savs konts)' : ' (cita lietotāja konts)'}${selectedRowKeys.length > 1 ? ` (masveida maiņa)` : ''}`,
              {
                old_role: user.role,
                new_role: values.role,
                bulk_action: selectedRowKeys.length > 1,
                total_updated: selectedRowKeys.length > 1 ? selectedRowKeys.length : undefined,
                is_own_account: isOwnAccount,
                is_other_user_account: !isOwnAccount,
                modified_by: userProfile?.username || 'Nezināms',
                target_user_role: values.role,
              },
              user.id
            );
            if (!result.success) {
              console.warn('Failed to log role change:', result.error);
            }
          } catch (logError) {
            console.error('Error logging role change:', logError);
            // Don't throw - logging failure shouldn't block the operation
          }
        }
      }

      message.success(`${selectedRowKeys.length} lietotāju lomas veiksmīgi mainītas`);
      setIsBulkRoleModalOpen(false);
      bulkRoleForm.resetFields();
      setSelectedRowKeys([]);
      fetchUsers();
    } catch (error) {
      message.error('Kļūda maiņot lomas');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk change status
  const handleBulkStatusChange = async (status) => {
    try {
      setBulkActionLoading(true);

      // Get selected users to check permissions
      const selectedUsers = users.filter((u) => selectedRowKeys.includes(u.id));

      // Check if trying to change FROM suspended - only super_admin can do this
      if (status !== 'suspended') {
        const hasSuspendedUsers = selectedUsers.some((u) => u.status === 'suspended');
        if (hasSuspendedUsers && !isSuperAdmin) {
          message.error('Tikai galvenais administrators var mainīt aizliegtu lietotāju statusu');
          setBulkActionLoading(false);
          return;
        }
      }

      // If changing to suspended, check permissions and show confirmation
      if (status === 'suspended') {
        // Check if trying to suspend any super_admin accounts - NOBODY can suspend super_admin
        const hasSuperAdminUsers = selectedUsers.some((u) => u.role === 'super_admin');
        if (hasSuperAdminUsers) {
          message.error('Nevar bloķēt galvenā administratora kontus');
          setBulkActionLoading(false);
          return;
        }

        // Permission checks based on current user role
        if (isAdmin && !isSuperAdmin) {
          // Admins can only suspend employees
          const hasNonEmployeeUsers = selectedUsers.some((u) => u.role !== 'employee');
          if (hasNonEmployeeUsers) {
            message.error('Administrators var bloķēt tikai darbiniekus');
            setBulkActionLoading(false);
            return;
          }
        }
        // Super_admins can suspend employees and admins (but not super_admins - already checked above)
        
        // Show confirmation, then proceed with update (same as active/inactive)
        console.log('Bulk: Showing confirmation modal for suspension');
        console.log('Bulk: Selected users:', selectedUsers.map(u => ({ id: u.id, role: u.role, status: u.status })));
        console.log('Bulk: Selected row keys:', selectedRowKeys);
        
        modal.confirm({
          title: `Vai tiešām vēlaties bloķēt ${selectedRowKeys.length === 1 ? 'izvēlēto lietotāju' : 'izvēlētos lietotājus'}?`,
          content: `${selectedRowKeys.length} ${selectedRowKeys.length === 1 ? 'lietotājs' : 'lietotāji'} vairs nevarēs pieslēgties. ${!isSuperAdmin ? 'Tikai galvenais administrators varēs atbloķēt šos kontus.' : ''}`,
          okText: 'Jā, bloķēt',
          cancelText: 'Atcelt',
          okButtonProps: { danger: true },
          onOk: async () => {
            console.log('Bulk: User clicked OK in confirmation modal');
            console.log('Bulk: About to call performBulkStatusUpdate with status:', status);
            console.log('Bulk: Selected row keys at modal OK:', selectedRowKeys);
            
            try {
              await performBulkStatusUpdate(status);
              console.log('Bulk: performBulkStatusUpdate completed successfully');
            } catch (error) {
              console.error('Bulk: Error in performBulkStatusUpdate from modal:', error);
              // Don't rethrow - let performBulkStatusUpdate handle the error display
            }
          },
          onCancel: () => {
            console.log('Bulk: User cancelled suspension');
            setBulkActionLoading(false);
          }
        });
        return; // Exit early, confirmation will handle the update
      }

      // If no confirmation needed, proceed with update
      await performBulkStatusUpdate(status);
    } catch (error) {
      message.error('Kļūda maiņot statusu');
      setBulkActionLoading(false);
    }
  };

  // Perform the actual bulk status update
  const performBulkStatusUpdate = async (status) => {
    console.log('=== performBulkStatusUpdate START ===');
    console.log('Status:', status);
    console.log('Selected row keys:', selectedRowKeys);
    console.log('Is super admin:', isSuperAdmin);
    console.log('Is admin:', isAdmin);
    
    try {
      console.log('About to call Supabase update...');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ status })
        .in('id', selectedRowKeys)
        .select();
      
      console.log('Supabase update completed');
      console.log('Response data:', data);
      console.log('Response error:', error);

      if (error) {
        console.error('Database error updating status:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      // Check if any rows were actually updated
      if (!data || data.length === 0) {
        console.warn('No rows updated. This might be an RLS policy issue.');
        message.error('Nav atjaunināti lietotāji. Pārbaudiet atļaujas vai izvēlētos lietotājus.');
        return;
      }

      console.log('Successfully updated users:', data);
      
      // Log activity: bulk status change
      // IMPORTANT: Get previous users BEFORE fetchUsers() updates the state
      const previousUsers = users.filter((u) => selectedRowKeys.includes(u.id));
      console.log('Previous users for logging:', previousUsers);
      console.log('Current users state length:', users.length);
      console.log('Selected row keys:', selectedRowKeys);
      
      for (const updatedUser of data) {
        const previousUser = previousUsers.find((u) => u.id === updatedUser.id);
        console.log(`Processing user ${updatedUser.username}:`, {
          previousUser: previousUser ? 'found' : 'NOT FOUND',
          previousStatus: previousUser?.status,
          newStatus: status,
          statusChanged: previousUser && previousUser.status !== status,
          willLog: previousUser && previousUser.status !== status
        });
        
        // ALWAYS log if we have a previous user, even if status appears the same
        // (sometimes the state might already be updated)
        if (previousUser) {
          // Log regardless - the database update already happened
          const statusActuallyChanged = previousUser.status !== status;
          console.log(`Status actually changed: ${statusActuallyChanged} (${previousUser.status} -> ${status})`);
          
          if (statusActuallyChanged) {
          const isOwnAccount = updatedUser.id === userProfile?.id;
          const logDescription = `Mainīts lietotāja statuss: ${updatedUser.username} no "${getStatusLabel(previousUser.status).label}" uz "${getStatusLabel(status).label}"${isOwnAccount ? ' (savs konts)' : ' (cita lietotāja konts)'}${data.length > 1 ? ` (masveida maiņa)` : ''}`;
          
          console.log('Attempting to log status change:', {
            actionType: ActionTypes.STATUS_CHANGED,
            description: logDescription,
            userId: updatedUser.id
          });
          
          try {
            const result = await logUserAction(
              ActionTypes.STATUS_CHANGED,
              logDescription,
              {
                old_status: previousUser.status,
                new_status: status,
                bulk_action: data.length > 1,
                total_updated: data.length > 1 ? data.length : undefined,
                is_own_account: isOwnAccount,
                is_other_user_account: !isOwnAccount,
                modified_by: userProfile?.username || 'Nezināms',
                target_user_role: updatedUser.role,
                target_user_status: status,
              },
              updatedUser.id
            );
            
            console.log('Log result:', result);
            
            if (!result.success) {
              console.error('Failed to log status change:', result.error);
              console.error('Error details:', {
                message: result.error?.message,
                stack: result.error?.stack
              });
            } else {
              console.log('Successfully logged status change, log ID:', result.logId);
            }
          } catch (logError) {
            console.error('Exception while logging status change:', logError);
            console.error('Error details:', {
              message: logError?.message,
              stack: logError?.stack
            });
            // Don't throw - logging failure shouldn't block the operation
          }
          } else {
            console.warn(`Skipping log for ${updatedUser.username}: status appears unchanged (${previousUser.status} -> ${status})`);
          }
        } else {
          console.error(`Cannot log: previousUser not found for ${updatedUser.username} (ID: ${updatedUser.id})`);
        }
      }

      message.success(`${data.length} lietotāju statusi veiksmīgi mainīti`);
      setSelectedRowKeys([]);
      fetchUsers();
    } catch (error) {
      console.error('Error in performBulkStatusUpdate:', error);
      const errorMessage = error.message || error.details || error.hint || 'Kļūda maiņot statusu';
      message.error(`Kļūda: ${errorMessage}`);
      throw error;
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Check if current user can edit a specific user
  const canEditUser = (targetUser) => {
    if (!userProfile || !targetUser) return false;

    // Prevent users from editing their own account in UserAccounts page
    // They should use the Profile page instead
    if (targetUser.id === userProfile.id) {
      return false;
    }

    // Admins cannot edit users with "aizliegts" (suspended) status
    // Only super_admin can edit suspended users
    if (targetUser.status === 'suspended' && !isSuperAdmin) {
      return false;
    }

    // Employee cannot edit any other users
    if (!isAdmin && !isSuperAdmin) {
      return false;
    }

    // Admin can edit any employee
    if (isAdmin && !isSuperAdmin) {
      return targetUser.role === 'employee';
    }

    // Super admin can edit all admins and employees
    // BUT cannot edit other super admins
    if (isSuperAdmin) {
      return targetUser.role !== 'super_admin';
    }

    return false;
  };

  // Open edit modal with user data
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      name: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setIsEditModalOpen(true);
  };

  // Handle sending password reset email
  const handleSendPasswordReset = async () => {
    if (!editingUser) return;

    try {
      setSubmitting(true);
      
      const result = await sendPasswordResetEmail(editingUser.email, editingUser.username);
      
      // Log activity: password reset requested
      await logSecurityAction(
        ActionTypes.PASSWORD_RESET_REQUESTED,
        `Nosūtīts paroles maiņas e-pasts lietotājam ${editingUser.username}`,
        {
          sent_by_admin: true,
        }
      );

      messageApi.success(`Paroles maiņas e-pasts nosūtīts uz ${editingUser.email}`);
      
      // Set cooldown to 10 minutes (600 seconds)
      setPasswordResetCooldown(600);
      
      // Update cooldown every second
      const cooldownInterval = setInterval(() => {
        setPasswordResetCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      // Check if it's a cooldown error (429 status)
      if (error.status === 429 || error.message?.includes('Cooldown') || error.message?.includes('wait')) {
        // Try to extract cooldown from error message or response
        let cooldownSeconds = 600; // Default 10 minutes
        
        // Try to extract from error message
        const cooldownMatch = error.message?.match(/(\d+)\s*minute/);
        if (cooldownMatch) {
          cooldownSeconds = parseInt(cooldownMatch[1]) * 60;
        }
        
        // Try to extract from error context/body
        if (error.context?.body?.cooldownRemaining) {
          cooldownSeconds = error.context.body.cooldownRemaining;
        }
        
        setPasswordResetCooldown(cooldownSeconds);
        
        // Update cooldown every second
        const cooldownInterval = setInterval(() => {
          setPasswordResetCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(cooldownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        const minutes = Math.ceil(cooldownSeconds / 60);
        messageApi.warning(`Lūdzu, uzgaidiet ${minutes} minūte(s) pirms nākamās sūtīšanas`);
      } else {
        messageApi.error('Kļūda nosūtot paroles maiņas e-pastu: ' + (error.message || 'Nezināma kļūda'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle user edit submission with status change confirmation
  const handleEditUser = async (values) => {
    try {
      setSubmitting(true);

      if (!editingUser) {
        setSubmitting(false);
        return;
      }

      // Status-based permission check
      // Only super_admin can change status FROM "suspended"
      if (editingUser.status === 'suspended' && values.status !== 'suspended' && !isSuperAdmin) {
        message.error('Tikai galvenais administrators var mainīt aizliegtu lietotāju statusu');
        setSubmitting(false);
        return;
      }

      // Role-based permission check for role changes
      if (values.role !== editingUser.role) {
        const isEditingSelf = editingUser.id === userProfile?.id;
        
        // Employee can't change roles at all
        if (!isAdmin && !isSuperAdmin) {
          message.error('Jums nav atļaujas mainīt lomas');
          return;
        }

        // Allow admins and super_admins to change their own roles
        if (isEditingSelf) {
          // Admins can change their own role to employee
          // Super admins can change their own role to any role
          if (isAdmin && !isSuperAdmin && values.role !== 'employee') {
            message.error('Administrators var mainīt savu lomu tikai uz darbinieka lomu');
            return;
          }
          // Super admins can change their own role to any role - no restriction needed
        } else {
          // When editing others: Admin can only set role to employee
          if (isAdmin && !isSuperAdmin && values.role !== 'employee') {
            message.error('Administrators var piešķirt tikai darbinieka lomu');
            return;
          }
        }
      }

      // Check email uniqueness if email is changed
      if (values.email.toLowerCase() !== editingUser.email.toLowerCase()) {
        const { data: existingUsers, error: checkError } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('email', values.email.toLowerCase())
          .neq('id', editingUser.id)
          .limit(1);

        if (checkError) {
          throw checkError;
        }

        if (existingUsers && existingUsers.length > 0) {
          message.error('Lietotājs ar šo e-pastu jau eksistē');
          return;
        }
      }

      // If changing status to "suspended", check permissions and show confirmation
      if (values.status === 'suspended' && editingUser.status !== 'suspended') {
        // Check if trying to suspend super_admin - NOBODY can suspend super_admin
        if (editingUser.role === 'super_admin') {
          message.error('Nevar bloķēt galvenā administratora kontu');
          setSubmitting(false);
          return;
        }

        // Permission checks based on current user role
        if (isAdmin && !isSuperAdmin) {
          // Admins can only suspend employees
          if (editingUser.role !== 'employee') {
            message.error('Administrators var bloķēt tikai darbiniekus');
            setSubmitting(false);
            return;
          }
        }
        // Super_admins can suspend employees and admins (but not super_admins - already checked above)

        // Show confirmation modal - return a promise that resolves when user confirms
        return new Promise((resolve) => {
          modal.confirm({
            title: 'Vai tiešām vēlaties bloķēt šo lietotāju?',
            content: `Lietotājs "${editingUser.username}" vairs nevarēs pieslēgties. ${!isSuperAdmin ? 'Tikai galvenais administrators varēs atbloķēt šo kontu.' : ''}`,
            okText: 'Jā, bloķēt',
            cancelText: 'Atcelt',
            okButtonProps: { danger: true },
            onOk: async () => {
              console.log('Edit modal: User confirmed suspension, calling performUserUpdate');
              try {
                await performUserUpdate(values);
                resolve();
              } catch (error) {
                console.error('Edit modal: Error in performUserUpdate:', error);
                resolve(); // Resolve anyway to allow form to complete
              }
            },
            onCancel: () => {
              console.log('Edit modal: User cancelled suspension');
              setSubmitting(false);
              resolve(); // Resolve to allow form to complete
            }
          });
        });
      }

      // If no confirmation needed, proceed with update
      await performUserUpdate(values);
    } catch (error) {
      message.error(error.message || 'Kļūda atjauninot lietotāju');
    } finally {
      setSubmitting(false);
    }
  };

  // Perform the actual user update
  const performUserUpdate = async (values) => {
    try {
      console.log('performUserUpdate called with:', {
        userId: editingUser.id,
        values,
        isSuperAdmin,
        isAdmin
      });

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          username: values.name,
          email: values.email.toLowerCase(),
          role: values.role,
          status: values.status,
        })
        .eq('id', editingUser.id)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Database error updating user:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No rows updated in performUserUpdate. This might be an RLS policy issue.');
        message.error('Nav atjaunināti lietotāja dati. Pārbaudiet atļaujas.');
        return;
      }

      console.log('Successfully updated user:', data[0]);
      
      const updatedUser = data[0];
      const changes = [];
      const details = {
        target_user_id: editingUser.id,
        target_user_email: editingUser.email,
        target_user_username: editingUser.username,
      };

      console.log('Comparing changes:', {
        editingUserStatus: editingUser.status,
        valuesStatus: values.status,
        editingUserRole: editingUser.role,
        valuesRole: values.role,
        editingUserUsername: editingUser.username,
        valuesName: values.name,
        editingUserEmail: editingUser.email,
        valuesEmail: values.email
      });

      // Track what changed
      if (editingUser.username !== values.name) {
        changes.push(`vārds: "${editingUser.username}" → "${values.name}"`);
        details.old_username = editingUser.username;
        details.new_username = values.name;
      }
      if (editingUser.email.toLowerCase() !== values.email.toLowerCase()) {
        changes.push(`e-pasts: "${editingUser.email}" → "${values.email}"`);
        details.old_email = editingUser.email;
        details.new_email = values.email;
      }
      if (editingUser.role !== values.role) {
        changes.push(`loma: "${getRoleLabel(editingUser.role).label}" → "${getRoleLabel(values.role).label}"`);
        details.old_role = editingUser.role;
        details.new_role = values.role;
      }
      if (editingUser.status !== values.status) {
        changes.push(`statuss: "${getStatusLabel(editingUser.status).label}" → "${getStatusLabel(values.status).label}"`);
        details.old_status = editingUser.status;
        details.new_status = values.status;
      }

      console.log('Changes detected:', changes);
      console.log('Changes length:', changes.length);
      console.log('Will log?', changes.length > 0);

      // Log activity: user updated
      if (changes.length > 0) {
        // Determine action type based on what changed
        let actionType = ActionTypes.USER_UPDATED;
        let description = 'Atjaunināti lietotāja dati';
        
        if (details.old_role !== undefined || details.new_role !== undefined) {
          actionType = ActionTypes.ROLE_CHANGED;
          description = `Mainīta loma no "${getRoleLabel(details.old_role).label}" uz "${getRoleLabel(details.new_role).label}"`;
        } else if (details.old_status !== undefined || details.new_status !== undefined) {
          actionType = ActionTypes.STATUS_CHANGED;
          description = `Mainīts statuss no "${getStatusLabel(details.old_status).label}" uz "${getStatusLabel(details.new_status).label}"`;
        } else if (details.old_username || details.new_username) {
          description = 'Mainīts lietotāja vārds';
        } else if (details.old_email || details.new_email) {
          description = 'Mainīts lietotāja e-pasts';
        }

        // Clean up details - remove IDs and emails/usernames
        const cleanDetails = { ...details };
        delete cleanDetails.target_user_id;
        delete cleanDetails.target_user_email;
        delete cleanDetails.target_user_username;
        delete cleanDetails.old_email;
        delete cleanDetails.new_email;
        delete cleanDetails.old_username;
        delete cleanDetails.new_username;

        const isOwnAccount = editingUser.id === userProfile?.id;
        const enhancedDetails = {
          ...cleanDetails,
          is_own_account: isOwnAccount,
          is_other_user_account: !isOwnAccount,
          modified_by: userProfile?.username || 'Nezināms',
          target_user_role: updatedUser.role,
          target_user_status: updatedUser.status,
        };
        
        // Enhance description to indicate if it's own account or other user's account
        const enhancedDescription = `${description}: ${editingUser.username}${isOwnAccount ? ' (savs konts)' : ' (cita lietotāja konts)'}`;
        
        console.log('Attempting to log user update:', {
          actionType,
          description: enhancedDescription,
          userId: editingUser.id,
          details: enhancedDetails
        });
        
        try {
          const result = await logUserAction(
            actionType,
            enhancedDescription,
            enhancedDetails,
            editingUser.id
          );
          
          console.log('Log result:', result);
          
          if (!result.success) {
            console.error('Failed to log user update:', result.error);
            console.error('Error details:', {
              message: result.error?.message,
              stack: result.error?.stack
            });
          } else {
            console.log('Successfully logged user update, log ID:', result.logId);
          }
        } catch (logError) {
          console.error('Exception while logging user update:', logError);
          console.error('Error details:', {
            message: logError?.message,
            stack: logError?.stack
          });
          // Don't throw - logging failure shouldn't block the operation
        }
      }

      message.success('Lietotāja dati veiksmīgi atjaunināti');
      setIsEditModalOpen(false);
      editForm.resetFields();
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error in performUserUpdate:', error);
      const errorMessage = error.message || error.details || error.hint || 'Kļūda atjauninot lietotāju';
      message.error(`Kļūda: ${errorMessage}`);
      throw error;
    }
  };

  // Row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
    getCheckboxProps: (record) => ({
      // Users can't select themselves
      // Admins can't select other admins or super_admins
      // Admins can't select suspended users (only super_admin can)
      // Super admins can't select other super admins
      disabled: 
        record.id === userProfile?.id || 
        (isAdmin && !isSuperAdmin && (record.role === 'admin' || record.role === 'super_admin')) ||
        (isAdmin && !isSuperAdmin && record.status === 'suspended') ||
        (isSuperAdmin && record.role === 'super_admin' && record.id !== userProfile?.id),
    }),
  };

  // Role display mapping
  const getRoleLabel = (role) => {
    const roleMap = {
      super_admin: { label: 'Galvenais administrators', color: 'red' },
      admin: { label: 'Administrators', color: 'blue' },
      employee: { label: 'Darbinieks', color: 'default' },
    };
    return roleMap[role] || { label: role, color: 'default' };
  };

  // Status display mapping
  const getStatusLabel = (status) => {
    const statusMap = {
      active: { label: 'Aktīvs', color: 'success' },
      inactive: { label: 'Neaktīvs', color: 'default' },
      suspended: { label: 'Aizliegts', color: 'error' },
    };
    return statusMap[status] || { label: status, color: 'default' };
  };

  // Capitalize each word in a string
  const capitalizeWords = (str) => {
    if (!str) return str;
    return str
      .split(' ')
      .map(word => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Format date with leading zeros
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Get status badge style
  const getStatusBadgeStyle = (status) => {
    const statusStyles = {
      active: {
        background: '#dcfce7',
        color: '#166534',
        darkBackground: 'rgba(34, 197, 94, 0.1)',
        darkColor: '#86efac',
      },
      inactive: {
        background: '#f3f4f6',
        color: '#4b5563',
        darkBackground: 'rgba(107, 114, 128, 0.1)',
        darkColor: '#9ca3af',
      },
      suspended: {
        background: '#fee2e2',
        color: '#991b1b',
        darkBackground: 'rgba(239, 68, 68, 0.1)',
        darkColor: '#fca5a5',
      },
    };
    return statusStyles[status] || statusStyles.inactive;
  };

  const columns = [
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Lietotājvārds</span>,
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => (a.username || '').localeCompare(b.username || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => <Text style={{ fontWeight: 500, color: '#111827' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>E-pasts</span>,
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
      sortDirections: ['ascend', 'descend'],
      render: (text) => <Text style={{ color: '#6b7280' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Loma</span>,
      dataIndex: 'role',
      key: 'role',
      sorter: (a, b) => {
        const roleOrder = { 'super_admin': 3, 'admin': 2, 'employee': 1 };
        return (roleOrder[a.role] || 0) - (roleOrder[b.role] || 0);
      },
      sortDirections: ['ascend', 'descend'],
      render: (role) => {
        const roleInfo = getRoleLabel(role);
        return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>;
      },
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Statuss</span>,
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => {
        const statusOrder = { 'active': 3, 'inactive': 2, 'suspended': 1 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      },
      sortDirections: ['ascend', 'descend'],
      render: (status) => {
        const statusInfo = getStatusLabel(status);
        const badgeStyle = getStatusBadgeStyle(status);
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '9999px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 500,
              background: badgeStyle.background,
              color: badgeStyle.color,
            }}
          >
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Pēdējā pieslēgšanās</span>,
      dataIndex: 'last_login',
      key: 'last_login',
      sorter: (a, b) => {
        const dateA = a.last_login ? new Date(a.last_login).getTime() : 0;
        const dateB = b.last_login ? new Date(b.last_login).getTime() : 0;
        return dateA - dateB;
      },
      sortDirections: ['ascend', 'descend'],
      render: (date) => <Text style={{ color: '#6b7280' }}>{formatDate(date)}</Text>,
    },
    {
      title: <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>Darbības</span>,
      key: 'actions',
      render: (_, record) => {
        const canEdit = canEditUser(record);
        
        if (!canEdit) {
          return null;
        }

        const menuItems = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Rediģēt',
            onClick: () => handleOpenEditModal(record),
          },
        ];

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              style={{
                padding: '4px',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="action-button"
            />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <Title level={1} style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: '1.2' }}>
                Lietotāju konti
              </Title>
              <Tooltip 
                title={
                  <div style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>Lietotāju pārvalde</div>
                    <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      Šeit varat izveidot, rediģēt un pārvaldīt sistēmas lietotājus. Administrators var izveidot tikai darbiniekus, bet galvenais administrators var izveidot visus lietotājus. Varat mainīt lomas, statusus un veikt masveida darbības. Aizliegtus lietotājus var atbloķēt tikai galvenais administrators.
                    </div>
                  </div>
                }
                placement="right"
              >
                <InfoCircleOutlined style={{ color: '#6b7280', fontSize: '20px', cursor: 'help' }} />
              </Tooltip>
            </div>
            <Text style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
              Pārvaldīt sistēmas lietotājus un to piekļuves lomas
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            style={{
              minWidth: '140px',
              height: '40px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Pievienot jaunu lietotāju
          </Button>
        </div>

        {/* Search and Bulk Actions Bar */}
        <Card
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
          styles={{ body: { padding: '16px' } }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            {/* Search Input */}
            <Input
              placeholder="Meklēt pēc vārda, e-pasta vai lomas..."
              prefix={<SearchOutlined style={{ color: '#6b7280' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{
                minWidth: '320px',
                maxWidth: '480px',
                height: '40px',
                borderRadius: '8px',
              }}
            />

            {/* Bulk Actions (show when rows selected) */}
            {selectedRowKeys.length > 0 && (
              <Space size="middle">
                <Text style={{ fontSize: '14px', color: '#6b7280' }}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{selectedRowKeys.length}</span> lietotāji izvēlēti
                </Text>
                
                <Button
                  icon={<UserSwitchOutlined />}
                  onClick={() => setIsBulkRoleModalOpen(true)}
                  style={{
                    height: '36px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'normal',
                    color: '#6b7280',
                  }}
                >
                  Mainīt lomu
                </Button>

                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'active',
                        label: 'Aktīvs',
                        onClick: () => handleBulkStatusChange('active'),
                      },
                      {
                        key: 'inactive',
                        label: 'Neaktīvs',
                        onClick: () => handleBulkStatusChange('inactive'),
                      },
                      {
                        key: 'suspended',
                        label: 'Aizliegts',
                        danger: true,
                        onClick: () => handleBulkStatusChange('suspended'),
                      },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Button
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 'normal',
                      color: '#6b7280',
                    }}
                  >
                    Mainīt statusu
                  </Button>
                </Dropdown>

                <Popconfirm
                  title="Dzēst izvēlētos lietotājus?"
                  description={`Vai tiešām vēlaties dzēst ${selectedRowKeys.length} lietotājus? Šī darbība ir neatgriezeniska.`}
                  onConfirm={handleBulkDelete}
                  okText="Dzēst"
                  cancelText="Atcelt"
                  okButtonProps={{ danger: true }}
                  disabled={selectedRowKeys.includes(userProfile?.id)}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={bulkActionLoading}
                    disabled={selectedRowKeys.includes(userProfile?.id)}
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 'normal',
                    }}
                  >
                    Dzēst izvēlētos
                  </Button>
                </Popconfirm>
              </Space>
            )}
          </div>
        </Card>

        {/* Users Table */}
        <Card
          variant="outlined"
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
          styles={{ body: { padding: 0 } }}
        >
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Spin size="large" />
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <Table
                  columns={columns}
                  dataSource={filteredUsers.map((user) => ({ ...user, key: user.id }))}
                  rowSelection={rowSelection}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `Rāda ${range[0]} līdz ${range[1]} no ${total} rezultātiem`,
                    style: {
                      padding: '16px',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    },
                  }}
                  className="custom-table"
                  rowClassName="custom-table-row"
                />
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Create User Modal */}
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Pievienot jaunu lietotāju
          </Title>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        centered
        width={600}
        style={{
          borderRadius: '12px',
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Vārds, Uzvārds</span>}
            name="name"
            rules={[{ required: true, message: 'Lūdzu, ievadiet vārdu, uzvārdu' }]}
            normalize={capitalizeWords}
          >
            <Input
              placeholder="Jānis Bērziņš"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>E-pasts</span>}
            name="email"
            rules={[
              { required: true, message: 'Lūdzu, ievadiet e-pastu' },
              { type: 'email', message: 'Lūdzu, ievadiet derīgu e-pasta adresi' },
            ]}
          >
            <Input
              type="email"
              placeholder="janis.berzins@example.com"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Parole</span>}
            name="password"
            rules={[
              { required: true, message: 'Lūdzu, ievadiet paroli' },
              { min: 8, message: 'Parolei jābūt vismaz 8 simbolu garai' },
            ]}
          >
            <Input.Password
              placeholder="Ievadiet paroli"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Loma</span>}
            name="role"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties lomu' }]}
            initialValue="employee"
          >
            <Select
              placeholder="Izvēlieties lomu"
              style={{ height: '40px', borderRadius: '8px' }}
            >
              <Option value="employee">Darbinieks</Option>
              {/* Only super_admin can create admin and super_admin accounts */}
              {isSuperAdmin && <Option value="admin">Administrators</Option>}
              {isSuperAdmin && <Option value="super_admin">Galvenais administrators</Option>}
            </Select>
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Statuss</span>}
            name="status"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties statusu' }]}
            initialValue="active"
          >
            <Select
              placeholder="Izvēlieties statusu"
              style={{ height: '40px', borderRadius: '8px' }}
            >
              <Option value="active">Aktīvs</Option>
              <Option value="inactive">Neaktīvs</Option>
              <Option value="suspended">Aizliegts</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  form.resetFields();
                }}
                style={{ height: '40px', borderRadius: '8px' }}
              >
                Atcelt
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Izveidot lietotāju
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Role Change Modal */}
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Mainīt lietotāju lomas
          </Title>
        }
        open={isBulkRoleModalOpen}
        onCancel={() => {
          setIsBulkRoleModalOpen(false);
          bulkRoleForm.resetFields();
        }}
        footer={null}
        centered
        width={500}
      >
        <Form
          form={bulkRoleForm}
          layout="vertical"
          onFinish={handleBulkRoleChange}
          style={{ marginTop: '24px' }}
        >
          <div style={{ marginBottom: '24px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
            <Text style={{ fontSize: '14px', color: '#6b7280' }}>
              Izvēlēti <span style={{ fontWeight: 600, color: '#111827' }}>{selectedRowKeys.length}</span> lietotāji
            </Text>
          </div>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Jauna loma</span>}
            name="role"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties lomu' }]}
          >
            <Select
              placeholder="Izvēlieties jauno lomu"
              style={{ height: '40px', borderRadius: '8px' }}
            >
              <Option value="employee">Darbinieks</Option>
              {isSuperAdmin && <Option value="admin">Administrators</Option>}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsBulkRoleModalOpen(false);
                  bulkRoleForm.resetFields();
                }}
                style={{ height: '40px', borderRadius: '8px' }}
              >
                Atcelt
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={bulkActionLoading}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Mainīt lomu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Rediģēt lietotāju
          </Title>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          editForm.resetFields();
          setEditingUser(null);
        }}
        footer={null}
        centered
        width={600}
        style={{
          borderRadius: '12px',
        }}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditUser}
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Vārds, Uzvārds</span>}
            name="name"
            rules={[{ required: true, message: 'Lūdzu, ievadiet vārdu, uzvārdu' }]}
            normalize={capitalizeWords}
          >
            <Input
              placeholder="Jānis Bērziņš"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>E-pasts</span>}
            name="email"
            rules={[
              { required: true, message: 'Lūdzu, ievadiet e-pastu' },
              { type: 'email', message: 'Lūdzu, ievadiet derīgu e-pasta adresi' },
            ]}
          >
            <Input
              type="email"
              placeholder="janis.berzins@example.com"
              style={{ height: '40px', borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Loma</span>}
            name="role"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties lomu' }]}
          >
            <Select
              placeholder="Izvēlieties lomu"
              style={{ height: '40px', borderRadius: '8px' }}
              disabled={!isAdmin && !isSuperAdmin}
            >
              <Option value="employee">Darbinieks</Option>
              {/* Only super_admin can assign admin and super_admin roles */}
              {isSuperAdmin && <Option value="admin">Administrators</Option>}
              {isSuperAdmin && <Option value="super_admin">Galvenais administrators</Option>}
            </Select>
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Statuss</span>}
            name="status"
            rules={[{ required: true, message: 'Lūdzu, izvēlieties statusu' }]}
          >
            <Select
              placeholder="Izvēlieties statusu"
              style={{ height: '40px', borderRadius: '8px' }}
            >
              <Option value="active">Aktīvs</Option>
              <Option value="inactive">Neaktīvs</Option>
              <Option value="suspended">Aizliegts</Option>
            </Select>
          </Form.Item>

          {/* Password Reset Button */}
          <Form.Item style={{ marginBottom: '24px', marginTop: '24px' }}>
            <Popconfirm
              title="Nosūtīt paroles maiņas e-pastu?"
              description={`Paroles maiņas e-pasts tiks nosūtīts uz ${editingUser?.email || 'lietotāja e-pastu'}. Vai turpināt?`}
              onConfirm={handleSendPasswordReset}
              okText="Jā, nosūtīt"
              cancelText="Atcelt"
              okButtonProps={{ loading: submitting }}
              disabled={passwordResetCooldown > 0}
            >
              <Button
                type="default"
                icon={<MailOutlined />}
                loading={submitting}
                disabled={passwordResetCooldown > 0}
                block
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  borderColor: '#0068FF',
                  color: '#0068FF',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                {passwordResetCooldown > 0
                  ? `Lūdzu, uzgaidiet ${Math.ceil(passwordResetCooldown / 60)} min`
                  : 'Nosūtīt paroles maiņas e-pastu'}
              </Button>
            </Popconfirm>
            {passwordResetCooldown > 0 && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#6b7280',
                textAlign: 'center'
              }}>
                Atkārtota sūtīšana pieejama pēc {Math.ceil(passwordResetCooldown / 60)} minūtēm
              </div>
            )}
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  editForm.resetFields();
                  setEditingUser(null);
                }}
                style={{ height: '40px', borderRadius: '8px' }}
              >
                Atcelt
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Saglabāt izmaiņas
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Custom Table Styles */}
      <style>{`
        .custom-table .ant-table {
          font-size: 14px;
        }

        .custom-table .ant-table-thead > tr > th {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 16px;
          font-weight: 500;
        }

        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e5e7eb;
          padding: 16px;
          height: 72px;
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

        .custom-table .ant-table-tbody > tr.custom-table-row:hover {
          background: #f9fafb;
        }

        .action-button:hover {
          background: rgba(43, 108, 238, 0.1) !important;
        }

        .ant-modal-content {
          border-radius: 12px;
        }

        .ant-modal-header {
          border-bottom: 1px solid #e5e7eb;
          padding: 24px;
        }

        .ant-modal-body {
          padding: 24px;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default UserAccounts;

