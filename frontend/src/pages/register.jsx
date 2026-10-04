import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import './LoginPage.css'
import auth from '../api/auth'
import Button from '../components/Button'
import PersonalKeyInput from '../components/PersonalKeyInput'

function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [personalKey, setPersonalKey] = useState(['', '', '', ''])
  const [stage, setStage] = useState('form') // 'form' | 'done'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.state && location.state.email) setEmail(location.state.email)
  }, [location])

  const handleStartRegister = async () => {
    setError('')
    if (!username) return setError('กรุณากรอกชื่อผู้ใช้')
    if (!email.includes('@')) return setError('รูปแบบอีเมลไม่ถูกต้อง')
    if (password.length < 8) return setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    if (password !== confirmPassword) return setError('รหัสผ่านและการยืนยันไม่ตรงกัน')
    if (!personalKey.every(digit => /^\d$/.test(digit))) return setError('กรุณากรอกรหัสส่วนตัวให้ครบ 4 หลัก')

    setLoading(true)
    const res = await auth.register(username, email, password, personalKey.join(''))
    setLoading(false)

    if (!res.success) {
      setError(res.reason || 'ไม่สามารถสมัครได้')
      return
    }
    setStage('done')
  }

  if (stage === 'done') {
    return (
      <div className="login-shell">
        <div className="auth-page">
          <h1 className="success-title">สมัครสมาชิกสำเร็จ</h1>
          <p>คุณสามารถเข้าสู่ระบบได้แล้ว</p>
          <Link to="/login">ไปที่หน้าเข้าสู่ระบบ</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login-shell">
      <div className="auth-page">
        <h1>สมัครสมาชิก</h1>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="ชื่อผู้ใช้" />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน" />
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="ยืนยันรหัสผ่าน" />
        <PersonalKeyInput
          value={personalKey}
          onChange={setPersonalKey}
          label="รหัสส่วนตัว 4 หลัก (ใช้ยืนยันการเปลี่ยนรหัสผ่าน)"
        />
        {error && <div className="error">{error}</div>}
        <Button className="btn--block" onClick={handleStartRegister} disabled={loading}>
          {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </Button>
        <p>มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link></p>
      </div>
    </div>
  )
}

export default RegisterPage