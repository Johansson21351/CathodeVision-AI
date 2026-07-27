import { useState } from "react"
import { useNavigate, Link } from 'react-router-dom'
import './loginPage.css'

function RegisterPage() {
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const navigate = useNavigate()

    const handleRegister = () => {
        if (password !== confirmPassword) {
            alert('รหัสผ่านไม่ตรงกัน')
            return
        }
        if (password.length < 8) {
            alert('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
            return
        }
        if (!username || !email || !password || !confirmPassword) {
            alert('กรอกให้ครบก่อนนะ')
            return
        }
        alert('สมัครสมาชิกสำเร็จ!')
        navigate('/login')
    }

  return (
    <div className="auth-page">
      <h1>สมัครสมาชิก</h1>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="ชื้อผู้ใช้" />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน" />
      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="ยืนยันรหัสผ่าน" />
      <button onClick={handleRegister}>สมัครสมาชิก</button>
      <p>มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link></p>
    </div>
  )
}

export default RegisterPage
