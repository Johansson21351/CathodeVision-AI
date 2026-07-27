import { useState } from "react"
import { useNavigate, Link } from 'react-router-dom'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import './LoginPage.css'

function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()

    const handleLogin = () => {
        if (!username || !password) {
            Swal.fire({
                icon: 'warning',
                title: 'กรอกให้ครบก่อนนะ',
                confirmButtonColor: '#22c55e',
            })
            return
        }

        navigate('/')
    }

    return (
        <div className="login-shell">
            <div className="auth-page">
                <h1>Sign in</h1>
                <div className="field">
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Username"
                    />
                </div>

                <div className="field">
                    <label htmlFor="password">Password</label>
                    <div className="password-input-wrapper">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Password"
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(prev => !prev)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? '🙈' : '👁️'}
                        </button>
                    </div>
                </div>

                <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>

                <button className="primary-button" onClick={handleLogin}>SIGN IN</button>

                <div className="bottom-row">
                    <span>No account?</span>
                    <Link to="/register" className="register-link">Register</Link>
                </div>
            </div>
        </div>
    )
}
export default LoginPage