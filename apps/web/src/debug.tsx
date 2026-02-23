console.log('DEBUG.TSX START')
import { createRoot } from 'react-dom/client'
import './index.css'
import { useAuthStore } from './store/auth.store'
import { AppHeader } from './components/shared/AppHeader'

const root = document.getElementById('root')
if (root) {
    console.log('DEBUG RENDER MOUNTING')
    createRoot(root).render(<h1 style={{ color: 'red', fontSize: '48px' }}>PÁGINA DE DEPURAÇÃO ATIVA</h1>)
    console.log('DEBUG RENDER DONE')
} else {
    console.error('ROOT ELEMENT NOT FOUND')
}
