import { useState } from "react"
import { Link } from 'react-router-dom'
import './LoginPage.css'
import './forgetPassword.css'
import Button from '../components/Button'
import PersonalKeyInput from '../components/PersonalKeyInput'
import auth from '../api/auth'

function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [emailVerified, setEmailVerified] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [personalKey, setPersonalKey] = useState(['', '', '', ''])
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

    const handleCheckEmail = async () => {
        setError('')
        if (!email.includes('@')) {
            setError('รูปแบบอีเมลไม่ถูกต้อง')
            return
        }
        setLoading(true)
        const res = await auth.forgotPassword(email.trim())
        setLoading(false)
        if (!res.success) {
            setError(res.reason || 'ส่งคำขอไม่สำเร็จ')
            return
        }
        setEmailVerified(true)
    }

    const handleResetPassword = async () => {
        setError('')
        if (password.length < 8) {
            setError('รหัสผ่านต้องยาวอย่างน้อย 8 ตัว')
            return
        }
        if (password !== confirmPassword) {
            setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
            return
        }
        if (!personalKey.every(digit => /^\d$/.test(digit))) {
          setError('กรุณากรอกรหัสส่วนตัวให้ครบ 4 หลัก')
          return
        }

        setLoading(true)
        const res = await auth.resetPassword(email.trim(), password, personalKey.join(''))
        setLoading(false)
        if (!res.success) {
            setError(res.reason || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
            return
        }
        setMessage(res.message)
    }

    return (
        <div className="login-shell">
          <div className="auth-page">
            {message ? (
              <>
                <h1>เปลี่ยนรหัสผ่านสำเร็จ</h1>
                <p>{message}</p>
                <Link to="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
              </>
            ) : !emailVerified ? (
              <>
                <h1>ลืมรหัสผ่าน</h1>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล" />
                {error && <div className="error">{error}</div>}
                <Button className="btn--block" onClick={handleCheckEmail} disabled={loading}>
                    {loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบอีเมล'}
                </Button>
                <p>กลับไปหน้าเข้าสู่ระบบ? <Link to="/login">เข้าสู่ระบบ</Link></p>
              </>
            ) : (
              <>
                <h1>ตั้งรหัสผ่านใหม่</h1>
                <p>ยืนยันอีเมลแล้ว: {email}</p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                  autoComplete="new-password"
                />
                <PersonalKeyInput
                  value={personalKey}
                  onChange={setPersonalKey}
                  label="รหัสส่วนตัว 4 หลัก"
                />
                {error && <div className="error">{error}</div>}
                <Button className="btn--block" onClick={handleResetPassword} disabled={loading}>
                    {loading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
                </Button>
                <button type="button" className="forgot-link" onClick={() => {
                    setEmailVerified(false)
                    setPassword('')
                    setConfirmPassword('')
                    setPersonalKey(['', '', '', ''])
                    setError('')
                }}>เปลี่ยนอีเมล</button>
              </>
            )}
          </div>
        </div>
    )
}

export default ForgotPasswordPage