import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../../components/Navbar';
import { useSession } from 'next-auth/react';

// Mock the useSession hook
jest.mock('next-auth/react');

describe('Navbar Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock implementation for authenticated user
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com', role: 'user' },
        expires: new Date(Date.now() + 2 * 86400).toISOString(),
      },
      status: 'authenticated',
    });
  });

  it('renders the logo and navigation links when authenticated', () => {
    render(<Navbar />);
    
    // Check if logo is rendered
    expect(screen.getByAltText(/logo/i)).toBeInTheDocument();
    
    // Check if navigation links are rendered
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/invoices/i)).toBeInTheDocument();
  });

  it('shows user dropdown when clicking on user menu', () => {
    render(<Navbar />);
    
    // Find and click the user menu button
    const userMenuButton = screen.getByRole('button', { name: /test user/i });
    fireEvent.click(userMenuButton);
    
    // Check if dropdown items are visible
    expect(screen.getByText(/profile/i)).toBeInTheDocument();
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
  });

  it('renders login button when not authenticated', () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    
    render(<Navbar />);
    
    // Check if login button is rendered
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    
    // Navigation links should not be rendered
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
  });

  it('shows admin links when user has admin role', () => {
    // Mock admin session
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: { name: 'Admin User', email: 'admin@example.com', role: 'admin' },
        expires: new Date(Date.now() + 2 * 86400).toISOString(),
      },
      status: 'authenticated',
    });
    
    render(<Navbar />);
    
    // Check if admin links are rendered
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
  });
});