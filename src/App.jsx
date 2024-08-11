import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Products from './pages/products'
import Product from './pages/product'
import Game from './pages/game'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<div> Main page </div>} />
        <Route path='/about' element={<div> Hola 2  </div>} />
        <Route path='/products' element={<Products />} />
        <Route path='/product/:id' element={<Product />} />
        <Route path='/game/:id' element={<Game />} />
        <Route path='*' element={<div> Not Found </div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
