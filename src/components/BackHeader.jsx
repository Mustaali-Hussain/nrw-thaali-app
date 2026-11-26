import { useNavigate } from 'react-router-dom'

/*
 * BackHeader — sub-page header with back button + title
 *
 * Used on every sub-page (Profile, Weekly Menu, Feedback, etc.)
 *
 * Design specs from prototype:
 *   - Container: padding 0 24px 20px, flex row, gap 12px
 *   - Back button: 36×36px, border-radius 10px, white bg, 1px border
 *   - Title: 20px, 700 weight
 */

export default function BackHeader({ title, onBack }) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button className="back-btn" onClick={handleBack} aria-label="Go back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1 className="text-sub-title">{title}</h1>
    </div>
  )
}
