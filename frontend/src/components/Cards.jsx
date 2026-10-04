import './Cards.css'

export default function Card({ title, value, note, children, className = '' }) {
    if (title || value) {
        return (
            <div className={`card card--stat ${className}`}>
                <div className="card-header">
                    <div className="card-title">{title}</div>
                    <div className="card-icon" aria-hidden="true">📷</div>
                </div>

                <div className="card-body">
                    <div className="card-value">{value}</div>
                    {note && <div className="card-note">{note}</div>}
                </div>

                {children}
            </div>
        )
    }

    return (
        <div className={`card ${className}`}>
            {title && <h3>{title}</h3>}
            {children}
        </div>
    )
}