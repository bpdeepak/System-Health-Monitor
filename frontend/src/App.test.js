// frontend/src/App.test.js
import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider

test('renders learn react link', () => {
  render(
    // Wrap your App component with AuthProvider
    <AuthProvider>
      <App />
    </AuthProvider>
  );
  // Assuming 'learn react' is a piece of text that should be present when the app renders.
  // If your App component's initial render doesn't show 'learn react' anymore,
  // you'll need to adjust this assertion based on what's visible.
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});