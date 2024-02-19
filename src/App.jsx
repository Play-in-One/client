import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Products from './pages/products'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<div> Main page </div>} />
        <Route path='/about' element={<div> Hola 2  </div>} />
        <Route path='/products' element={<Products />} />
        <Route path='/products/:id' element={<div> Hola 4 </div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
