import { useEffect, useState } from 'react'

export const ProductLabel = ({product}) => {
    return (
        <div className='p-2 w-60'>
            <a href={"game/" + product.game} target='_blank'>
                <div className='bg-3 rounded-1'>
                {/* <div className='bg-[linear-gradient(rgba(250,0,0,0.5),transparent)]'> */}
                    <img src={product.url_image} />
                    <h1>{product.title}</h1>
                    {/* <p>{product.platform}</p> */}
                    <p>{product.price}</p>
                    <p>{product.id}</p>
                    <p>{product.seller}</p>
                    {/* <p>{JSON.stringify(product)}</p> */}
                </div>
            </a>
        </div>
    )
}