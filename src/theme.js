import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c6cff',
    },
    secondary: {
      main: '#ff6eb4',
    },
    background: {
      default: '#0f1117',
      paper: '#171a23',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

export default theme
