import { useEffect, useState } from 'react'
import axios from 'axios'

const Products = () => {

    const [min_price, setMinPrice] = useState(0)
    const [max_price, setMaxPrice] = useState(100_000_000)

    const [largest, setLargest] = useState(25)
    const [skip, setSkip] = useState(0)

    const [products, setProduct] = useState([])

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('submit')
        axios.get('http://localhost:8000/api/product/', {
            params: {
                min_price: min_price,
                max_price: max_price,
                largest: largest,
                skip: skip
        }}).then(response => {
            setProduct(response.data);
            console.log(response.data);
            console.log(response.headers)
        })
    }

    useEffect(() => {handleSubmit({preventDefault: () => {}})}, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <h1>Products</h1>
            <div>
                <div>precio minimo: {min_price}</div>
                <div>precio maximo: {max_price}</div>
                <div>largest: {largest}</div>
                <div>skip: {skip}</div>
            </div>

            <form onSubmit={handleSubmit}>
                <input className='bg-2 mx-2' value={min_price} onChange={(e) => setMinPrice(parseInt(e.target.value))} />
                <input className='bg-2 mx-2' value={max_price} onChange={(e) => setMaxPrice(parseInt(e.target.value))} />
                <input className='bg-2 mx-2' value={largest} onChange={(e) => setLargest(parseInt(e.target.value))} />
                <input className='bg-2 mx-2' value={skip} onChange={(e) => setSkip(parseInt(e.target.value))} />
                <button className='bg-4 p-2' type='submit'>Buscar</button>
            </form>

            <ul className='px-6'>
                {products.map((product, index) => (
                    <li key={index} className='p-2'>
                        <a href={product.url} target='_blank'>
                            <div className='bg-3'>
                                {/* <h1>{index}</h1> */}
                                <p>{product.seller}</p>
                                <h1>{product.title}</h1>
                                <p>{product.console}</p>
                                <p>{product.price}</p>
                            </div>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Products;





// function App() {

//   const [products, setProduct] = useState([])


//   useEffect(() => {
//     axios.get('http://localhost:8000/api/product/').then(response => {
//       setProduct(response.data);
//       console.log(response.data)
//     })
//   }, [])


//   return (
//     <ul className='px-6'>
//       {products.map((product, index) => (
//         <il key={index} className='px-6'>
//           <a href={product.url}>
//             <div className='bg-blue-300'>
//               <h1>{index}</h1>
//               <h1>{product.title}</h1>
//               <p>{product.price}</p>
//             </div>
//           </a>
//         </il>
//       ))}
//     </ul>
//   )
// }

// export default App
