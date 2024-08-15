import { useEffect, useState } from 'react'
import axios from 'axios'
import { ProductLabel } from '../components/product_label'

import { Platform } from '../request'


const Products = () => {

    const [name, setName] = useState("")

    const [products, setProduct] = useState([])

    const [page_size, setPage_size] = useState(25)

    const [page_count, setPage_count] = useState(1)

    const [max_page, setMax_page] = useState()

    const [orden, setOrden] = useState("title")

    const [platform, setPlatform] = useState("")

    const handleSubmit = (e) => {
        e.preventDefault();
        axios.get(import.meta.env.VITE_BACKEND_LINK + "/products/", {
            params: {
                page: page_count,
                page_size: page_size,
                search: name,
                orden: orden,
                platform: platform
        }}).then(response => {
            setProduct(response.data['results']);
            setMax_page(Math.trunc(1 + response.data['count'] / page_size));
        })
    }

    useEffect(() => {
        handleSubmit({preventDefault: () => {}})
    }, [page_size, page_count]);


    useEffect(() => {handleSubmit({preventDefault: () => {}})}, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className='flex bg-1 align-middle justify-center'>
            <h1>Products</h1>

            <form onSubmit={handleSubmit} className='bg-2 rounded-1 p-4 w-96'>
                <div>
                    <div>
                        Nombre: <input className='bg-1 mx-2' value={name} onChange={(data) => setName(data.target.value)} />
                    </div>
                    <div>
                        Sort:
                        <select className='bg-1 mx-2' onChange={(data) => setOrden(data.target.value)}>
                            <option value='title'>Nombre</option>
                            <option value='price'>Precio</option>
                        </select>
                    </div>
                    <div>
                        Platform:
                        <select className='bg-1 mx-2' onChange={(data) => setPlatform(data.target.value)}>
                            <option value=''>Any</option>
                            <option value='1'>PC</option>
                            <option value='2'>PS4</option>
                            <option value='3'>PS5</option>
                            <option value='4'>Xbox</option>
                            <option value='5'>Switch</option>
                        </select>
                    </div>
                </div>
                <button className='bg-4 p-2' type='submit' onClick={() => setPage_count(1)}>Buscar</button>
            </form>

            <div className='flex justify-center flex-col'>
                <ul className='flex flex-wrap px-6 bg-2 w-[80%]'>
                    {products.map((product, index) => (
                        <li key={index}>
                            <ProductLabel product={product} />
                        </li>
                    ))}
                </ul>
                <div className=''>
                    <button className='bg-4 p-2' type='submit' onClick={() => setPage_count(1)}>
                        first
                    </button>
                    <button className='bg-4 p-2' type='submit' onClick={() => setPage_count(Math.max(page_count-1, 1))}>
                        prev
                    </button>
                    <select className='bg-2' onChange={(data) => setPage_size(data.target.value)}>
                        <option value='25'>25</option>
                        <option value='50'>50</option>
                        <option value='100'>100</option>
                    </select>
                    <button className='bg-4 p-2' type='submit' onClick={() => setPage_count(Math.min(page_count+1, max_page))}>
                        next
                    </button>
                    <button className='bg-4 p-2' type='submit' onClick={() => setPage_count(max_page)}>
                        last
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Products;


