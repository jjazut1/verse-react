import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import GamePlayer from './components/GamePlayer'
import TeacherDashboard from './pages/TeacherDashboard'
import ConfigurationRouter from './pages/configurations/ConfigurationRouter'
import WhackAMoleConfig from './pages/configurations/WhackAMoleConfig'
import SortCategoriesEggConfig from './pages/configurations/SortCategoriesEggConfig'

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
