/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['Syne', 'Inter', 'sans-serif'],
			display: ['Syne', 'system-ui', 'sans-serif'],
  			mono: ['DM Mono', 'JetBrains Mono', 'monospace'],
        stats: ['Bebas Neue', 'sans-serif']
  		},
  		colors: {
  			background: '#070911',
  			foreground: '#dde4f4',
        'midnight': '#0b0e18',
        'brutal-border': '#181e30',
        'brutal-muted': '#3d4a66',
        'amber-accent': '#f59e0b',
        'cyan-accent': '#00e5ff',
  			primary: {
  				DEFAULT: '#f59e0b',
  				foreground: '#070911'
  			},
  			border: '#181e30',
  			card: {
  				DEFAULT: 'rgba(11, 14, 24, 0.6)',
  				foreground: '#dde4f4'
  			}
  		},
  		boxShadow: {
  			'brutal-amber': '3px 3px 0px 0px #f59e0b',
  			'brutal-dark': '5px 5px 0px 0px #000000',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  		},
  		keyframes: {
  			'spin-a': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
  			'spin-b': { '0%': { transform: 'rotate(360deg)' }, '100%': { transform: 'rotate(0deg)' } },
        'reveal': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pdot': { '0%, 100%': { opacity: '0.4' }, '50%': { opacity: '1' } }
  		},
  		animation: {
  			'spin-slow': 'spin-a 20s linear infinite',
  			'spin-reverse-slow': 'spin-b 25s linear infinite',
        'reveal': 'reveal 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards',
        'pulse-dot': 'pdot 2s ease-in-out infinite'
  		},
      transitionTimingFunction: {
        'menu': 'cubic-bezier(0.23, 1, 0.32, 1)'
      }
  	}
  },
  plugins: [require("tailwindcss-animate")]
}