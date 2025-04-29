import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationPreference {
  email: {
    classification_complete: boolean;
    review_needed: boolean;
    submission_status: boolean;
    system_updates: boolean;
  };
  inApp: {
    classification_complete: boolean;
    review_needed: boolean;
    submission_status: boolean;
    system_updates: boolean;
    daily_digest: boolean;
  };
}

const NotificationPreferences = () => {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Fetch notification preferences
  const fetchPreferences = async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }
      
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  // Save notification preferences
  const savePreferences = async () => {
    if (!session || !preferences) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const response = await fetch('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferences
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }
      
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  // Send test email notification
  const sendTestEmail = async () => {
    if (!session) return;

    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/v1/notifications/test-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test email');
      }
      
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error sending test email:', err);
      setError('Failed to send test email');
    } finally {
      setSaving(false);
    }
  };

  // Handle preference change
  const handlePreferenceChange = (channel: 'email' | 'inApp', type: string, value: boolean) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      [channel]: {
        ...preferences[channel],
        [type]: value
      }
    });
  };

  // Load preferences on component mount
  useEffect(() => {
    if (session) {
      fetchPreferences();
    }
  }, [session]);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Notification Preferences</h2>
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : success ? (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          Changes saved successfully
        </div>
      ) : null}
      
      {preferences && (
        <>
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Email Notifications</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="email-classification"
                  type="checkbox"
                  checked={preferences.email.classification_complete}
                  onChange={(e) => handlePreferenceChange('email', 'classification_complete', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  aria-label="Receive email notifications for classification completion"
                />
                <label htmlFor="email-classification" className="ml-2 block text-sm text-gray-700">
                  Classification completion
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="email-review"
                  type="checkbox"
                  checked={preferences.email.review_needed}
                  onChange={(e) => handlePreferenceChange('email', 'review_needed', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  aria-label="Receive email notifications for review needed"
                />
                <label htmlFor="email-review" className="ml-2 block text-sm text-gray-700">
                  Review needed
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="email-submission"
                  type="checkbox"
                  checked={preferences.email.submission_status}
                  onChange={(e) => handlePreferenceChange('email', 'submission_status', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  aria-label="Receive email notifications for submission status updates"
                />
                <label htmlFor="email-submission" className="ml-2 block text-sm text-gray-700">
                  Submission status updates
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="email-system"
                  type="checkbox"
                  checked={preferences.email.system_updates}
                  onChange={(e) => handlePreferenceChange('email', 'system_updates', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  aria-label="Receive email notifications for system updates"
                />
                <label htmlFor="email-system" className="ml-2 block text-sm text-gray-700">
                  System updates
                </label>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-3">In-App Notifications</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="inapp-classification"
                  type="checkbox"
                  checked={preferences.inApp.classification_complete}
                  onChange={(e) => handlePreferenceChange('inApp', 'classification_complete', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  aria-label="Receive in-app notifications for classification completion"
                />
                <label htmlFor="inapp-classification" className="ml-2 block text-sm text-gray-700">
                  Classification completion
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="inapp-review"
                  type="checkbox"
                  checked={preferences.inApp.review_needed}
                  onChange={(e) => handlePreferenceChange('inApp', 'review_needed', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  aria-label="Receive in-app notifications for review needed"
                />
                <label htmlFor="inapp-review" className="ml-2 block text-sm text-gray-700">
                  Review needed
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="inapp-submission"
                  type="checkbox"
                  checked={preferences.inApp.submission_status}
                  onChange={(e) => handlePreferenceChange('inApp', 'submission_status', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  aria-label="Receive in-app notifications for submission status updates"
                />
                <label htmlFor="inapp-submission" className="ml-2 block text-sm text-gray-700">
                  Submission status updates
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="inapp-system"
                  type="checkbox"
                  checked={preferences.inApp.system_updates}
                  onChange={(e) => handlePreferenceChange('inApp', 'system_updates', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  aria-label="Receive in-app notifications for system updates"
                />
                <label htmlFor="inapp-system" className="ml-2 block text-sm text-gray-700">
                  System updates
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="inapp-digest"
                  type="checkbox"
                  checked={preferences.inApp.daily_digest}
                  onChange={(e) => handlePreferenceChange('inApp', 'daily_digest', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  aria-label="Receive daily digest notifications"
                />
                <label htmlFor="inapp-digest" className="ml-2 block text-sm text-gray-700">
                  Daily digest
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={savePreferences}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            
            <button
              onClick={sendTestEmail}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
              disabled={saving}
            >
              Send Test Email
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationPreferences;