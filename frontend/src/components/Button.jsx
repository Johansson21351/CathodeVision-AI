import './Button.css'

function Button({ onClick, children, type = 'button', disabled = false, className = '', ...props }) {
    return (
        <button
            className={("btn " + className).trim()}
            onClick={onClick}
            type={type}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    )
}

export default Button