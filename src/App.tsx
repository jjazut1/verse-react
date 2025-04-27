import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UnsavedChangesProvider } from './contexts/UnsavedChangesContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import GamePlayer from './components/GamePlayer'
import TeacherDashboard from './pages/TeacherDashboard'
import ConfigurationRouter from './pages/configurations/ConfigurationRouter'
import WhackAMoleConfig from './pages/configurations/WhackAMoleConfig'
import SortCategoriesEggConfig from './pages/configurations/SortCategoriesEggConfig'
import Assignments from './pages/Assignments'
import AssignmentDetails from './pages/AssignmentDetails'
import AdminPage from './pages/AdminPage'
import SetAdminPage from './pages/SetAdminPage'

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
    path: "/login",
    element: <Layout><Login /></Layout>,
  },
  {
    path: "/forgot-password",
    element: <Layout><ForgotPassword /></Layout>,
  },
  {
    path: "/game/:configId",
    element: <Layout><GamePlayer /></Layout>,
  },
  {
    path: "/teacher",
    element: <Layout><TeacherDashboard /></Layout>,
  },
  {
    path: "/assignments",
    element: <Layout><Assignments /></Layout>,
  },
  {
    path: "/assignment/:token",
    element: <AssignmentDetails />,
  },
  {
    path: "/configure",
    element: <Layout><ConfigurationRouter /></Layout>,
    children: [
      {
        path: "whack-a-mole",
        element: <WhackAMoleConfig />
      },
      {
        path: "whack-a-mole/:templateId",
        element: <WhackAMoleConfig />
      },
      {
        path: "sort-categories-egg",
        element: <SortCategoriesEggConfig />
      },
      {
        path: "sort-categories-egg/:templateId",
        element: <SortCategoriesEggConfig />
      }
      // Additional game configuration routes will be added here
    ]
  },
  {
    path: "/admin",
    element: <Layout><AdminPage /></Layout>,
  },
  {
    path: "/set-admin",
    element: <Layout><SetAdminPage /></Layout>,
  }
]);

function App() {
  return (
    <AuthProvider>
      <UnsavedChangesProvider>
        <RouterProvider router={router} />
      </UnsavedChangesProvider>
    </AuthProvider>
  )
}

export default App
