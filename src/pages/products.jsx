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
                page: 1,
                page_size: 25,
                search: name,
                // platform: 3
        }}).then(response => {
            setProduct(response.data['results']);
        })
    }


    useEffect(() => {handleSubmit({preventDefault: () => {}})}, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className='flex bg-1 align-middle justify-center'>
            <h1>Products</h1>

            <form onSubmit={handleSubmit} className='bg-2 rounded-1 p-4 w-96'>
                <div>
                    Nombre: <input className='bg-1 mx-2' value={name} onChange={(data) => setName(data.target.value)} />
                </div>
                <button className='bg-4 p-2' type='submit'>Buscar</button>
            </form>

            <ul className='flex flex-wrap px-6 bg-2 w-[80%]'>
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


