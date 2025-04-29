import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import ProtectedRoute from '../../components/ProtectedRoute';
import NotificationPreferences from '../../components/NotificationPreferences';

const NotificationsSettingsPage = () => {
  return (
    <ProtectedRoute>
      <Head>
        <title>Notification Settings | Customs Documentation Platform</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Notification Settings</h1>
        
        <div className="max-w-3xl">
          <NotificationPreferences />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
  
  return {
    props: {}
  };
};

export default NotificationsSettingsPage;