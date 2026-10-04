import { useState, useEffect } from "react"
import { useNavigate, Link, useLocation } from 'react-router-dom'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import './LoginPage.css'
import Button from '../components/Button'
import auth from '../api/auth'

function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
        const navigate = useNavigate()
        const location = useLocation()
        const [failures, setFailures] = useState(0)

        useEffect(() => {
            // if already authenticated, redirect to the dashboard
            if (auth.isAuthenticated()) navigate('/dashboard')
            // prefill username if coming from register link
            if (location.state && location.state.username) setUsername(location.state.username)
        }, [])

        const handleLogin = async () => {
                if (!username || !password) {
                        Swal.fire({ icon: 'warning', title: 'กรอกให้ครบก่อนนะ', confirmButtonColor: '#22c55e' })
                        return
                }

                setLoading(true)
                const res = await auth.login(username, password)
                setLoading(false)

                if (res.success) {
                    navigate('/dashboard')
                    return
                }

                // backend ไม่แยกว่า "ไม่มี username นี้" กับ "รหัสผ่านผิด" (กันคนร้ายเดา username)
                // เลยไม่มีการ redirect ไปหน้า register อัตโนมัติเหมือนเดิมอีกต่อไป
                const f = failures + 1
                setFailures(f)
                if (f >= 3) {
                    navigate('/forgot-password')
                    return
                }

                Swal.fire({ icon: 'error', title: res.reason || 'เข้าสู่ระบบไม่สำเร็จ', text: `ความพยายาม ${f}/3`, confirmButtonColor: '#ef4444' })
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

                <Button className="btn--block" onClick={handleLogin} disabled={loading}>
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'SIGN IN'}
                </Button>

                <div className="bottom-row">
                    <span>No account?</span>
                    <Link to="/register" className="register-link">Register</Link>
                </div>
            </div>
        </div>
    )
}
export default LoginPage