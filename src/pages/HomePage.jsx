import { Link } from 'react-router-dom'
import './loginPage.css'

function HomePage() {
  return (
    <div className="auth-page">
      <h1>Welcome</h1>
      <p>Login to continue or create an account.</p>
      <div>
        <Link to="/login">เข้าสู่ระบบ</Link>
      </div>
    </div>
  )
}

export default HomePage
