import { Navigate } from 'react-router-dom'
import auth from '../api/auth'

export default function RequireAuth({ children }) {
  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}
