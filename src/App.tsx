import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import GamePlayer from './components/GamePlayer'
import TeacherDashboard from './pages/TeacherDashboard'

// Create a layout component that includes the Navbar
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout><Home /></Layout>,
  },
  {
    path: "/game/:configId",
    element: <Layout><GamePlayer /></Layout>,
  },
  {
    path: "/teacher",
    element: <Layout><TeacherDashboard /></Layout>,
  }
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
