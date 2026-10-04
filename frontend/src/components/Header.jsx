import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Header.css'
import auth from '../api/auth'
import { useNavigate } from 'react-router-dom'
import eye from '../assets/eye_logo.png'
import { useTheme } from '../ThemeContext'
import Button from './Button'

function Header() {
    const [time, setTime] = useState(() => new Date())
    const [gpuPerformance, setGpuPerformance] = useState('94%')

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const updateGpuPerformance = () => {
            const percent = 90 + Math.round(Math.random() * 9)
            setGpuPerformance(`${percent}%`)
        }

        updateGpuPerformance()
        const interval = setInterval(updateGpuPerformance, 5000)
        return () => clearInterval(interval)
    }, [])

    const formattedTime = time.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })

        const navigate = useNavigate()

        const handleLogout = () => {
            auth.logout()
            navigate('/login')
        }

        const user = auth.currentUser()

        return (
                <header className="app-header">
            <div className="header-group header-left">
                <div className="brand-block">
                    <img src={eye} alt="Eye Logo" className="brand-icon" aria-hidden="true" />
                    <div>
                        <div className="brand-name">VISIOAI</div>
                        <div className="brand-label">DEFECT DETECTION SYSTEM v2.4.1</div>
                    </div>
                </div>
                <span className="status-pill online">SYSTEM ONLINE</span>
            </div>

                {/* center actions removed (REJECT button) */}

                <div className="header-group header-right">
                    <div className="nav-block">
                        <Link to="/dashboard" className="nav-pill active">DASHBOARD</Link>
                        <Link to="/status" className="nav-pill">STATUS &amp; CONTROL</Link>
                        <Link to="/defect-log" className="nav-pill">DEFECT LOG</Link>
                        <Link to="/ai-control" className="nav-pill">AI CONTROL</Link>
                    </div>

                    <UserMenu user={user} onLogout={handleLogout} formattedTime={formattedTime} />
                </div>
        </header>
    )
}

    function UserMenu({ user, onLogout, formattedTime }){
        const { theme, toggle } = useTheme()
        const [open, setOpen] = useState(false)
        const ref = useRef(null)

        useEffect(()=>{
            function onDoc(e){
                if(ref.current && !ref.current.contains(e.target)) setOpen(false)
            }
            document.addEventListener('click', onDoc)
            return ()=> document.removeEventListener('click', onDoc)
        },[])

        return (
            <div className="user-dropdown" ref={ref}>
                <span className="info-label timestamp">{formattedTime}</span>
                {user ? (
                    <>
                        <button className="info-pill user-trigger" onClick={()=>setOpen(s => !s)}>
                            {user.split(' ')[0]}
                        </button>
                        {open && (
                            <div className="user-menu">
                                <div className="user-menu-item">Signed in as <strong>{user}</strong></div>
                                <div className="user-menu-actions">
                                    <Button className="menu-btn" onClick={toggle}>{theme === 'dark' ? 'Light' : 'Dark'}</Button>
                                    <button className="menu-btn logout" onClick={onLogout}>Logout</button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <Link to="/login" className="nav-pill">Login</Link>
                )}
            </div>
        )
    }

    export default Header