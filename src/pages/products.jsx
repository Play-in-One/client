import { useEffect, useState } from 'react'
import axios from 'axios'

const Products = () => {

    const [name, setName] = useState("")


    const [products, setProduct] = useState([])

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('submit')
        axios.get(import.meta.env.VITE_BACKEND_LINK + "/api/products/", {
            params: {
                search: name,
        }}).then(response => {
            setProduct(response.data);
            console.log(response.data);
            console.log(response.headers);
        })
    }

    useEffect(() => {handleSubmit({preventDefault: () => {}})}, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <h1>Products</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    Nombre: <input className='bg-2 mx-2' value={name} onChange={(data) => setName(data.target.value)} />
                </div>
                <button className='bg-4 p-2' type='submit'>Buscar</button>
            </form>

            <ul className='px-6'>
                {products.map((product, index) => (
                    <li key={index} className='p-2'>
                        <a href={product.url} target='_blank'>
                            <div className='bg-3'>
                                {/* <img src={product.url_image} alt={product.title} /> */}
                                <p>{product.seller}</p>
                                <h1>{product.title}</h1>
                                <p>{product.platform}</p>
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


