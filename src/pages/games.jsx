import { useEffect, useState } from 'react'
import axios from 'axios'
import { ProductLabel } from '../components/product_label'

import { Link, useNavigate, useParams } from "react-router-dom";

import { id_to_platforms, platforms_to_id } from "../request";

const Games = () => {

    const { platform } = useParams();

    console.log(platform);

    const [name, setName] = useState("")

    const [products, setProduct] = useState([])

    const [page_size, setPage_size] = useState(25)

    const [page_count, setPage_count] = useState(1)

    const [max_page, setMax_page] = useState()

    const [orden, setOrden] = useState("price")

    console.log(id_to_platforms);
    console.log(platforms_to_id);

    const handleSubmit = (e) => {
        e.preventDefault();
        axios.get(import.meta.env.VITE_BACKEND_LINK + "/products/", {
            params: {
                page: page_count,
                page_size: page_size,
                search: name,
                orden: orden,
                platform: platforms_to_id[platform]
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
        <div className='flex bg-1 align-middle justify-center p-4s'>


            <form onSubmit={handleSubmit} className='bg-2 rounded-1 p-4 w-96 m-2 flex flex-col h-min'>
                <div className='mb-3'>
                    <div className='flex m-1 items-center'>
                        <input
                            className='w-full bg-1 rounded-1 border-1 outline-none p-2'
                            placeholder="Nombre"
                            value={name}
                            onChange={(data) => setName(data.target.value)}
                        />
                    </div>
                    <div className='flex m-1 items-center'>
                        Ordenar:
                        <select
                            className='w-full bg-1 ml-3 rounded-1 border-1 outline-none p-2'
                            onChange={(data) => setOrden(data.target.value)}
                        >
                            <option value='price'>Precio</option>
                            <option value='title'>Nombre</option>
                        </select>
                    </div>
                </div>

                <button
                    className='bg-3 hover:bg-1 p-2 mx-6 rounded-1'
                    type='submit' onClick={() => setPage_count(1)}
                >
                    Buscar
                </button>
            </form>

            <div className='flex items-center flex-col w-[70%] rounded-1 m-2'>
                <ul className='flex flex-wrap px-6 rounded-1 justify-center'>
                    {products.map((product, index) => (
                        <li key={index}>
                            <ProductLabel product={product} />
                        </li>
                    ))}
                </ul>
                <div className='flex flex-row object-center'>
                    <button className='bg-3 hover:bg-2 p-2 m-3 rounded-1 w-16' type='submit' onClick={() => setPage_count(1)}>
                        {"<<<"}
                    </button>
                    <button className='bg-3 hover:bg-2 p-2 m-3 rounded-1 w-16' type='submit' onClick={() => setPage_count(Math.max(page_count-1, 1))}>
                        {"<"}
                    </button>
                    <select className='bg-2 m-2 rounded-1 p-3' onChange={(data) => setPage_size(data.target.value)}>
                        <option value='25'>25</option>
                        <option value='50'>50</option>
                        <option value='100'>100</option>
                    </select>
                    <button className='bg-3 hover:bg-2 p-2 m-3 rounded-1 w-16' type='submit' onClick={() => setPage_count(Math.min(page_count+1, max_page))}>
                        {">"}
                    </button>
                    <button className='bg-3 hover:bg-2 p-2 m-3 rounded-1 w-16' type='submit' onClick={() => setPage_count(max_page)}>
                        {">>>"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Games;


