import { useEffect, useState } from 'react'
import axios from 'axios'
import { ProductLabel } from '../components/product_label'

import { Platform } from '../request'


const Products = () => {

    const [name, setName] = useState("")

    const [products, setProduct] = useState([])

    const handleSubmit = (e) => {
        e.preventDefault();
        axios.get(import.meta.env.VITE_BACKEND_LINK + "/products/", {
            params: {
                search: name,
        }}).then(response => {
            setProduct(response.data);
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

            <ul className='flex flex-wrap px-6'>
                {products.map((product, index) => (
                    <li key={index}>
                        <ProductLabel product={product} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Products;


