import {useState} from "react"
import { Link } from 'react-router-dom'
import './forgetPassword.css'

function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)

    const handleSendEmail = () => {
        if (!email.includes('@')) {
            alert('รูปแบบอีเมลไม่ถูกต้อง')
            return
        }
        // Simulate sending email
        setSent(true)
    }
    if (sent) {
        return (
        <div className="auth-page">
            <h1 className="success-title">ส่งลิ้งก์สำเร็จ</h1>
            <p>ตรวจกล่องจดหมายของคุณเพื่อหาลิ้งก์รีเซ็ตรหัสผ่าน</p>
            <Link to="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
        )
    }   

    return (
        <div className="auth-page">
            <h1>ลืมรหัสผ่าน</h1>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล" />
            <button onClick={handleSendEmail}>ส่งลิ้งก์รีเซ็ตรหัสผ่าน</button>
            <p>กลับไปหน้าเข้าสู่ระบบ? <Link to="/login">เข้าสู่ระบบ</Link></p>
        </div>
    )
}

export default ForgotPasswordPage
