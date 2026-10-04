import { useRef } from 'react'
import './PersonalKeyInput.css'

function PersonalKeyInput({ value, onChange, label = 'รหัสส่วนตัว 4 หลัก' }) {
  const inputRefs = useRef([])
  const digits = value

  const setDigit = (index, digit) => {
    const next = [...digits]
    next[index] = digit
    onChange(next)
    if (digit && index < 3) inputRefs.current[index + 1]?.focus()
  }

  const handlePaste = (event, index) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4 - index)
    if (!pasted) return

    const next = [...digits]
    pasted.split('').forEach((digit, offset) => {
      next[index + offset] = digit
    })
    onChange(next)
    inputRefs.current[Math.min(index + pasted.length, 3)]?.focus()
  }

  return (
    <div className="personal-key-field">
      <label>{label}</label>
      <div className="personal-key-boxes" role="group" aria-label={label}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={element => { inputRefs.current[index] = element }}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            aria-label={`หลักที่ ${index + 1}`}
            autoComplete="off"
            onChange={event => {
              const entered = event.target.value.replace(/\D/g, '')
              setDigit(index, entered.slice(-1))
            }}
            onPaste={event => handlePaste(event, index)}
            onKeyDown={event => {
              if (event.key === 'Backspace' && !digit && index > 0) {
                inputRefs.current[index - 1]?.focus()
              } else if (event.key === 'ArrowLeft' && index > 0) {
                inputRefs.current[index - 1]?.focus()
              } else if (event.key === 'ArrowRight' && index < 3) {
                inputRefs.current[index + 1]?.focus()
              }
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default PersonalKeyInput
